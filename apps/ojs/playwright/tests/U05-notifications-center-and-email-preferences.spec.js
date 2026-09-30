// @ts-check
/**
 * @file playwright/tests/U05-notifications-center-and-email-preferences.spec.js
 *
 * Notifications center & email preferences — OJS suite, one test per
 * canonical scenario the spec runs on OJS (scenarios 1–8, 10 and 11 here;
 * scenario 9, the OJS-only issue email, needs the queue drained and lives in
 * `serial/U05-notifications-center-and-email-preferences.spec.js`).
 * Spec: docs/specs/U05-notifications-center-and-email-preferences.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A1 🐞,
 * A2 🐞, A3 🐞, A4 ❓, A5 ❓, A6 ❓, A7 ❓, A8 ❓, A9 ❓, A10 🐞, A11 ❓ (OPS1–OPS3
 * are a preprint server's). Where a test passes through one it asserts the
 * effect the spec states and leaves the finding's own claim unasserted
 * either way: S3 reads Manager B's "needs an editor" email as the control
 * and never reads Manager A's mailbox (A10, the "Both mailboxes" bullet's
 * marked half); S5 and S6 unsubscribe accounts whose tab is at its defaults
 * (A2); S7 reads the site-level tab and never saves it (A4); the footer
 * link is opened only while its task exists (A7) and the "needs an editor"
 * email is asserted by subject alone (A8). The spec's Coverage section
 * records everything else left out.
 *
 * Isolation: every test seeds its own scratch journal with throwaway
 * accounts through the scenario endpoint (unique tags of at most 12
 * characters, so no password reaches the Register page's 32-character
 * cap); `publicknowledge` and the roster are only read (S7), and S7's
 * Site Administrator reads only. Where the scenario needs the "needs an
 * editor" EMAIL, the Author submits through the wizard from a seeded draft
 * (a seeded `submitted: true` submission raises the task but sends no
 * email, seed-facts); where only the task is needed, the seed suffices.
 * Mailpit reads are scoped by the throwaway recipient (PRINCIPLES A8) and
 * every silence claim rides on a positive control. The bell's number is
 * asserted on a freshly loaded page or after the window closed, never on
 * the page that was open when the task was raised (Rule 2a). Every session
 * a scenario ends (S6's sign-out in a second tab, S5's sign-in from the
 * Unsubscribe page) lives in the test's own fresh browser context through
 * the real Login form, never in the shared .auth cache. Leaving the
 * workflow page after a discussion save raises the browser's leave-page
 * prompt, so S5 and S6 answer it. S7 reads a moving count (the Site
 * Administrator is a Manager of every scratch journal, so a parallel
 * worker's seed can raise a task between two reads); each pair of reads
 * is repeated until both agree, never asserted against a fixed value. No
 * hard-coded waits, except the one claim only the app's own toast timer
 * bounds (S3: "stays while the pointer rests on it", held for the toast's
 * 5-second lifetime read from `Page.vue`).
 */
const {test, expect} = require('../support/fixtures.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {
    ProfilePage,
    SAVED_MESSAGE,
    userNav,
    openUserNav,
} = require('../../../../shared/playwright/pages/ProfilePage.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {
    TasksPanel,
    UnsubscribePage,
    ReaderHeader,
    DISCUSSION_TASK,
    successToasts,
    toastCloseButton,
    expectStackedBelow,
    expectStaysWhileHovered,
} = require('../../../../shared/playwright/pages/NotificationsPages.js');
const {ReviewerAssignmentsPage, ReviewWizardPage} = require('../../../../shared/playwright/pages/ReviewerPages.js');
const {SubmissionWizardPage} = require('../pages/SubmissionWizardPage.js');
const {RegisterPage, RegistrationCompletePage} = require('../pages/RegistrationPages.js');
const {getPassword} = require('../../../../shared/playwright/data/users.js');
const {closeTab} = require('../../../../shared/playwright/support/tabs.js');

const JOURNAL = 'publicknowledge';
const NEEDS_EDITOR_TASK = 'A new article has been submitted to which an editor needs to be assigned.';
const NEEDS_EDITOR_SUBJECT = 'A new submission needs an editor to be assigned';
const NEEDS_EDITOR_SETTING = 'notificationEditorAssignmentRequired';
const DISCUSSION_SETTING = 'notificationNewQuery';
const DISCUSSIONS_PANEL = 'Desk Review Tasks & Discussions';
const VERSION_PUBLISHED_OPENING = /^\s*A new version of your submission/;
const VERSION_PUBLISHED_TASK = (title) => `A new version of your submission, "${title}", was published.`;
const REVIEW_COMPLETE_SUBJECT = 'Review complete';
const UNSUBSCRIBE_LINK = /\/notification\/unsubscribe\?validate=[^&]+&id=\d+$/;
const STALE_PAGE_SENTENCE = (email) =>
    `There was an unexpected error and we could not unsubscribe the email address ${email}. You can unsubscribe from all email notifications in your user profile or contact us directly for help.`;
const NOTIFICATIONS_INTRO =
    'Select the system events that you wish to be notified about. Unchecking an item will prevent notifications of the event from showing up in the system and also from being emailed to you. Checked events will appear in the system and you have an extra option to receive or not the same notification by email.';

/** The tab's groups and rows on a journal (Fields). */
const OJS_TAB = [
    {
        group: 'Public Announcements',
        rows: [
            'A new announcement has been created.',
            'An issue has been published.',
            'An issue has been made open access.',
        ],
    },
    {
        group: 'Submission Events',
        rows: [
            'A new article, "Title," has been submitted.',
            'A new version of your submission, "Title", was published.',
            NEEDS_EDITOR_TASK,
            'Discussion added.',
            'Discussion activity.',
        ],
    },
    {group: 'Reviewing Events', rows: ['A reviewer has commented on "Title".']},
    {group: 'Editors', rows: ['Weekly email of outstanding tasks', 'Statistics report summary.']},
];

/** The site-level tab: the same without the statistics row (scenario 7). */
const SITE_TAB = OJS_TAB.map((entry) =>
    entry.group === 'Editors' ? {group: entry.group, rows: ['Weekly email of outstanding tasks']} : entry
);

/** The Public Announcements rows' setting names (Rule 5e, note s8). */
const PUBLIC_SETTINGS = ['notificationNewAnnouncement', 'notificationPublishedIssue', 'notificationOpenAccess'];

/**
 * Unique per-run tag: a single alphanumeric token, feature + scenario +
 * worker + random, at most 12 characters (a throwaway username is the tag
 * plus two letters, and its password the username twice: under the Register
 * page's 32-character cap).
 */
function makeTag(scenario, testInfo) {
    return `u5${scenario}w${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

const emailOf = (username) => `${username}@mail.test`;

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A scratch journal with the named throwaway accounts. `admin` is auto-
 * enrolled as a Manager too (seed-facts) and gets every Manager task, which
 * touches nothing these tests assert.
 */
async function seedJournal(ojsApi, tag, users) {
    await ojsApi.createContext({tag, users});
    return {path: tag, name: `Scratch context ${tag}`};
}

/**
 * The Author submits: from a seeded draft (title and abstract ride in from
 * the seed; sections have no editors, so nobody is assigned), the wizard is
 * driven from Upload Files to the footer's "Submit" and the dialog's
 * "Submit". The wizard's own request sends the "needs an editor" email.
 */
async function submitViaWizard(ojsApi, authorPage, journalPath, {tag, submitter, title}) {
    const {submissionId} = await ojsApi.createSubmission({
        tag,
        context: journalPath,
        submitter,
        title,
        submitted: false,
        participants: [],
    });
    const wizard = new SubmissionWizardPage(authorPage, journalPath);
    await wizard.goto(submissionId);
    await wizard.expectStep('Upload Files');
    await wizard.uploadFile();
    await wizard.continueTo('Details');
    await wizard.continueTo('Contributors');
    await wizard.continueTo('For the Editors');
    await wizard.continueToReview(submissionId);
    await expect(wizard.errorBanner()).toHaveCount(0);
    await wizard.submitAndConfirm();
    return submissionId;
}

/** The editorial dashboard of a journal (any editorial page carries the bell). */
async function gotoEditorial(page, journalPath) {
    await page.goto(`/index.php/${journalPath}/dashboard/editorial`);
    await expect(new TasksPanel(page).bell()).toBeVisible({timeout: 30_000});
}

/** The Author's editorial page (My Submissions carries the bell too). */
async function gotoMySubmissions(page, journalPath) {
    await page.goto(`/index.php/${journalPath}/dashboard/mySubmissions`);
    await expect(new TasksPanel(page).bell()).toBeVisible({timeout: 30_000});
}

/** A journal's reader-facing home page (a scratch journal is single-locale: the bare address serves it). */
async function gotoHome(page, journalPath) {
    await page.goto(`/index.php/${journalPath}/index`);
    await expect(new ReaderHeader(page).toggle).toBeVisible({timeout: 30_000});
}

/** The site's own home page (`index/en`, Rule 4). */
async function gotoSiteHome(page) {
    await page.goto('/index.php/index/en');
    await expect(new ReaderHeader(page).toggle).toBeVisible({timeout: 30_000});
}

/** Open the Notifications tab for the signed-in account on a journal. */
async function openNotificationsTab(page, journalPath) {
    const profile = new ProfilePage(page, journalPath);
    await profile.goto('notifications');
    return profile;
}

/** A fresh, explicitly-anonymous context (never inherits cached storage state). */
async function anonContext(browser, baseURL) {
    return browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
}

/**
 * Fresh UI login on a journal's Login page, in its own context, for an
 * actor whose session the scenario ends (S6's sign-out), so the shared
 * .auth cache is never poisoned.
 */
async function freshLogin(browser, baseURL, contextPath, username) {
    const context = await anonContext(browser, baseURL);
    const page = await context.newPage();
    await page.goto(`/index.php/${contextPath}/login`);
    await new LoginPage(page).signIn(username, getPassword(username));
    return {context, page};
}

/** Sign out through the editorial user menu's "Logout" and wait for the Login page. */
async function signOut(page) {
    await openUserNav(page);
    await userNav(page).getByRole('link', {name: 'Logout', exact: true}).click();
    await page.waitForURL(/\/login/, {waitUntil: 'commit', timeout: 30_000});
    await expect(page.locator('form#login')).toBeVisible();
}

/**
 * The Manager opens a discussion with the Author (scenario 5's labels):
 * "Add" in the "Desk Review Tasks & Discussions" panel, a "Name", the
 * Author's box under "Participants" (the opener's own box arrives ticked
 * and the form offers no email choice), a message, "Save". Waits for the
 * save (`POST …/submissions/{id}/tasks`).
 */
async function addDiscussion(managerPage, {name, opener, participantUsername, message}) {
    const panel = managerPage.locator('[data-cy="discussion-manager"]').first();
    await expect(panel.getByRole('heading', {name: DISCUSSIONS_PANEL})).toBeVisible({timeout: 30_000});
    await panel.getByRole('button', {name: 'Add', exact: true}).click();
    // The workflow page is itself an active side modal; the form is the one
    // stacked over it that carries the "Name" box.
    const modal = managerPage
        .locator('[data-cy="active-modal"]')
        .filter({has: managerPage.locator('input[name="title"]')});
    await modal.locator('input[name="title"]').fill(name);
    // The participant boxes render a moment after the form opens; the
    // opener's own box arrives ticked, and no box or label offers an email
    // choice (the boxes themselves are the control that the form rendered).
    const participantBox = modal.getByRole('checkbox', {name: new RegExp(participantUsername)});
    await expect(participantBox).toBeVisible({timeout: 30_000});
    const ownBox = modal.getByRole('checkbox', {name: new RegExp(`${opener}\\) \\(Me\\)`)});
    await expect(ownBox).toBeChecked();
    await expect(participantBox).not.toBeChecked();
    await expect(modal.getByRole('checkbox', {name: /e-?mail/i})).toHaveCount(0);
    await expect(modal.getByText(/e-?mail/i)).toHaveCount(0);
    await participantBox.check();
    const body = modal.frameLocator('iframe').first().locator('body');
    await body.click();
    await body.fill(message);
    const saved = managerPage.waitForResponse(
        (response) =>
            response.request().method() === 'POST' && /\/submissions\/\d+\/tasks$/.test(response.url()),
        {timeout: 30_000}
    );
    await modal.getByRole('button', {name: 'Save', exact: true}).click();
    const response = await saved;
    expect(response.ok(), `discussion save answered ${response.status()}`).toBe(true);
    await expect(modal).toHaveCount(0, {timeout: 30_000});
}

/** The discussion email to one recipient, with its footer's "unsubscribe" link. */
async function discussionEmail(pkpMail, {to, name}) {
    const summary = await pkpMail.find({to, subject: name});
    const full = await pkpMail.fullMessage(summary.ID);
    const link = pkpMail.extractLink(full.HTML, /^unsubscribe$/i);
    return {summary, full, link};
}

/** The tab's ticked "Do not send me an email…" boxes. */
function checkedEmailBoxes(profile) {
    return profile.form('notifications').locator('input[id^="emailNotification"]:checked');
}

/** All "Enable…" boxes ticked; all "Do not send me an email…" boxes as `emailTicked`. */
async function expectTabState(profile, {emailTicked}) {
    const allow = profile.allowBoxes();
    const email = profile.emailBoxes();
    const count = await allow.count();
    expect(count).toBeGreaterThan(0);
    await expect(email).toHaveCount(count);
    for (let i = 0; i < count; i++) {
        await expect(allow.nth(i)).toBeChecked();
        if (emailTicked) {
            await expect(email.nth(i)).toBeChecked();
        } else {
            await expect(email.nth(i)).not.toBeChecked();
        }
    }
}

/**
 * Wait for the wall clock to tick to the next second. The Tasks window
 * orders rows by `date_created` (whole seconds), so two states created
 * inside the same second have no order; a scenario that needs "the later
 * one" lets the second change between them. Bounded by the clock, never
 * a fixed duration.
 */
async function nextSecond() {
    const started = Math.floor(Date.now() / 1000);
    await expect.poll(() => Math.floor(Date.now() / 1000), {timeout: 5_000}).toBeGreaterThan(started);
}

/** Open the Tasks window, read every row as text, close it. */
async function readTaskRows(page) {
    const tasks = new TasksPanel(page);
    await tasks.open();
    const rows = await tasks.rowTexts();
    await tasks.close();
    return rows;
}

test.describe('notifications center & email preferences', () => {
    test('S1: a submission raises a task, and the bell counts it', {tag: '@smoke'}, async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        const title = `Title ${tag}`;
        const journal = await seedJournal(ojsApi, tag, [
            {username: manager, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
            {username: author, givenName: 'Alba', familyName: 'Authorson', roles: ['author']},
        ]);

        // The Manager's page is open before the submission: no number.
        const managerPage = await (await asUser(manager)).newPage();
        const tasks = new TasksPanel(managerPage);
        const header = new ReaderHeader(managerPage);
        await gotoEditorial(managerPage, journal.path);
        await tasks.expectCount(0);

        // The Author submits through the wizard.
        const authorPage = await (await asUser(author)).newPage();
        const submissionId = await submitViaWizard(ojsApi, authorPage, journal.path, {tag, submitter: author, title});

        // Bounded by the Manager's own email, the page open before the
        // submission still shows no number; a reload shows "1" (Rule 2a).
        await pkpMail.find({to: emailOf(manager), subject: NEEDS_EDITOR_SUBJECT, contains: title});
        await tasks.expectCount(0);
        await managerPage.reload();
        await tasks.expectCount(1);

        // The reader-side count: on the journal's home page the name reads
        // "{name} 1"; under it "Dashboard" and "View Profile" and no list of
        // tasks (Rule 4).
        await gotoHome(managerPage, journal.path);
        await header.expectCount(manager, 1);
        await header.open();
        await expect(header.entry('Dashboard')).toBeVisible();
        await expect(header.entry('View Profile')).toBeVisible();
        await expect(header.wrapper).not.toContainText(NEEDS_EDITOR_TASK);
        await expect(header.wrapper).not.toContainText(title);

        // The window: one bold row with the sentence and the title; the bell
        // greyed out with no number while it is open (Rules 2a, 2b).
        await gotoEditorial(managerPage, journal.path);
        await tasks.open();
        await expect(tasks.rows()).toHaveCount(1);
        const row = tasks.rows().first();
        await tasks.expectUnread(row);
        await expect(tasks.sentence(row)).toHaveText(NEEDS_EDITOR_TASK);
        await expect(tasks.title(row)).toHaveText(title);
        await expect(tasks.bell()).toBeDisabled();
        await expect(tasks.bell()).toHaveText(/^\s*Tasks\s*$/);

        // The blank part of the row: nothing happens, the window stays and
        // the row is still unread (Rule 2c); the press of the text below is
        // the positive control.
        await tasks.pressBlankPart(row);
        await tasks.expectUnread(row);

        // Pressing the text opens the submissions dashboard with the workflow
        // in a panel headed with the Author's name and the title (Rule 2c).
        await tasks.openTask(row);
        await managerPage.waitForURL(new RegExp(`/${journal.path}/dashboard/editorial\\?.*workflowSubmissionId=${submissionId}`), {
            waitUntil: 'commit',
            timeout: 30_000,
        });
        const workflow = new WorkflowPage(managerPage, journal.path);
        await workflow.expectOpen(submissionId);
        await expect(workflow.header()).toContainText('Authorson');
        await expect(workflow.titleLine()).toContainText(title);

        // Back on an editorial page: no number; the row is read now; the
        // journal's home page reads "{name} 0" (Rule 4).
        await gotoEditorial(managerPage, journal.path);
        await tasks.expectCount(0);
        await tasks.open();
        await expect(tasks.rows()).toHaveCount(1);
        await tasks.expectRead(tasks.row(title));
        await gotoHome(managerPage, journal.path);
        await header.expectCount(manager, 0);
    });

    test('S2: Mark New, Mark Read, Delete', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const manager = `${tag}mg`;
        const otherManager = `${tag}m2`;
        const author = `${tag}au`;
        const journal = await seedJournal(ojsApi, tag, [
            {username: manager, roles: ['manager']},
            {username: otherManager, roles: ['manager']},
            {username: author, roles: ['author']},
        ]);
        // Two submissions, the first earlier (a seeded submission raises the
        // same task the wizard does; no email is needed here). The window
        // orders by the task's creation time to the second, so two seeds
        // inside one second would tie: the clock ticks over in between.
        const titles = [`First ${tag}`, `Second ${tag}`];
        await ojsApi.createSubmission({tag, context: journal.path, submitter: author, title: titles[0]});
        await nextSecond();
        await ojsApi.createSubmission({tag, context: journal.path, submitter: author, title: titles[1]});

        const managerPage = await (await asUser(manager)).newPage();
        const tasks = new TasksPanel(managerPage);
        await gotoEditorial(managerPage, journal.path);
        await tasks.expectCount(2);

        // Newest first: the later submission's title on the first row, the
        // earlier on the second; both unread (Rule 2b).
        await tasks.open();
        await expect(tasks.rows()).toHaveCount(2);
        await expect(tasks.title(tasks.rows().nth(0))).toHaveText(titles[1]);
        await expect(tasks.title(tasks.rows().nth(1))).toHaveText(titles[0]);
        await tasks.expectUnread(tasks.row(titles[0]));
        await tasks.expectUnread(tasks.row(titles[1]));

        // "Mark Read" with nothing ticked changes nothing and shows no message.
        await tasks.act('Mark Read', {expectRequest: false});
        await expect(tasks.rows()).toHaveCount(2);
        await tasks.expectUnread(tasks.row(titles[0]));
        await tasks.expectUnread(tasks.row(titles[1]));
        await expect(managerPage.locator('.pkpNotification')).toHaveCount(0);

        // Tick the first row, "Mark Read": regular type, box unticked; the
        // bell shows "1" once the window is closed (Rule 3).
        const firstTitle = titles[1];
        await tasks.box(tasks.row(firstTitle)).check();
        await tasks.act('Mark Read');
        await tasks.expectRead(tasks.row(firstTitle));
        await expect(tasks.box(tasks.row(firstTitle))).not.toBeChecked();
        await tasks.close();
        await tasks.expectCount(1);

        // "Mark New" on the same row: bold again; the bell shows "2".
        await tasks.open();
        await tasks.box(tasks.row(firstTitle)).check();
        await tasks.act('Mark New');
        await tasks.expectUnread(tasks.row(firstTitle));
        await tasks.close();
        await tasks.expectCount(2);

        // "Delete" on both: gone at once, "No Items", no number; a reload
        // shows the same.
        await tasks.open();
        await tasks.box(tasks.row(titles[0])).check();
        await tasks.box(tasks.row(titles[1])).check();
        await tasks.act('Delete');
        await expect(tasks.rows()).toHaveCount(0);
        await expect(tasks.noItems()).toBeVisible();
        await tasks.close();
        await tasks.expectCount(0);
        await managerPage.reload();
        await tasks.expectCount(0);
        await tasks.open();
        await expect(tasks.noItems()).toBeVisible();
        await expect(tasks.rows()).toHaveCount(0);

        // Control: the second Manager's own window still lists both rows for
        // the same submissions, unread (Actors & permissions).
        const otherPage = await (await asUser(otherManager)).newPage();
        const otherTasks = new TasksPanel(otherPage);
        await gotoEditorial(otherPage, journal.path);
        await otherTasks.expectCount(2);
        await otherTasks.open();
        await expect(otherTasks.rows()).toHaveCount(2);
        await expect(otherTasks.row(titles[0])).toHaveCount(1);
        await expect(otherTasks.row(titles[1])).toHaveCount(1);
        await otherTasks.expectUnread(otherTasks.row(titles[0]));
        await otherTasks.expectUnread(otherTasks.row(titles[1]));
    });

    test('S3: unticking "Enable…" stops the task, not the email', async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(180_000);
        const tag = makeTag('s3', testInfo);
        const managerA = `${tag}ma`;
        const managerB = `${tag}mb`;
        const author = `${tag}au`;
        const priorTitle = `Prior ${tag}`;
        const title = `Title ${tag}`;
        const controlTitle = `Control ${tag}`;
        const journal = await seedJournal(ojsApi, tag, [
            {username: managerA, roles: ['manager']},
            {username: managerB, roles: ['manager']},
            {username: author, roles: ['author']},
        ]);
        // An earlier submission, so both Managers hold a row already (note s3).
        await ojsApi.createSubmission({tag, context: journal.path, submitter: author, title: priorTitle});

        // Manager A unticks "Enable…" under the needs-editor row: the email
        // box greys out; "Save" shows the success toast at the top right.
        const pageA = await (await asUser(managerA)).newPage();
        const profileA = await openNotificationsTab(pageA, journal.path);
        const pairA = profileA.notificationPair(NEEDS_EDITOR_SETTING);
        await pairA.allow.uncheck();
        await expect(pairA.email).toBeDisabled();
        await profileA.save();
        const toasts = successToasts(pageA).filter({hasText: SAVED_MESSAGE});
        await expect(toasts.first()).toBeVisible();

        // The toast: "Save" again at once stacks a second under the first;
        // "×" on the first removes it; the other stays while the pointer
        // rests on it and goes by itself after the pointer leaves (Rule 9).
        await profileA.save();
        await expect(toasts).toHaveCount(2);
        await expectStackedBelow(toasts.nth(0), toasts.nth(1));
        await toastCloseButton(toasts.nth(0)).click();
        await expect(toasts).toHaveCount(1);
        await expectStaysWhileHovered(pageA, toasts.first());
        await expect(toasts).toHaveCount(0);

        // The Author submits through the wizard (the email is needed).
        const authorPage = await (await asUser(author)).newPage();
        await submitViaWizard(ojsApi, authorPage, journal.path, {tag, submitter: author, title});

        // Manager B's window gains the row and the bell "2".
        const pageB = await (await asUser(managerB)).newPage();
        const tasksB = new TasksPanel(pageB);
        await gotoEditorial(pageB, journal.path);
        await tasksB.expectCount(2);
        await tasksB.open();
        await expect(tasksB.row(title)).toHaveCount(1);
        await tasksB.expectUnread(tasksB.row(title));

        // Manager B's mailbox holds the email with the subject (the control
        // that bounds A's window read; A's mailbox is A10's, not read).
        const mailB = await pkpMail.find({to: emailOf(managerB), subject: NEEDS_EDITOR_SUBJECT, contains: title});
        expect(mailB.Subject).toBe(`${NEEDS_EDITOR_SUBJECT}: "${title}"`);

        // Manager A's window gains no row for this title and the bell stays
        // at "1" (the earlier row stays; Rule 5a).
        const tasksA = new TasksPanel(pageA);
        await gotoEditorial(pageA, journal.path);
        await tasksA.expectCount(1);
        await tasksA.open();
        await expect(tasksA.row(priorTitle)).toHaveCount(1);
        await expect(tasksA.row(title)).toHaveCount(0);
        await tasksA.close();

        // Re-ticked: the email box is offered again, unticked; "Save": the
        // window still holds no row for that submission (Rule 5a).
        await profileA.goto('notifications');
        await expect(pairA.allow).not.toBeChecked();
        await pairA.allow.check();
        await expect(pairA.email).toBeEnabled();
        await expect(pairA.email).not.toBeChecked();
        await profileA.save();
        await expect(successToasts(pageA).filter({hasText: SAVED_MESSAGE})).toBeVisible();
        await gotoEditorial(pageA, journal.path);
        await tasksA.expectCount(1);
        await tasksA.open();
        await expect(tasksA.row(title)).toHaveCount(0);
        await expect(tasksA.row(priorTitle)).toHaveCount(1);
        await tasksA.close();

        // Control: the Author submits again (the seed raises the row; only
        // the row is read): Manager A's window gains the row for this second
        // submission and none for the first; re-ticking brings back future
        // events only (Rule 5a).
        await ojsApi.createSubmission({tag, context: journal.path, submitter: author, title: controlTitle});
        await gotoEditorial(pageA, journal.path);
        await tasksA.expectCount(2);
        await tasksA.open();
        await expect(tasksA.row(controlTitle)).toHaveCount(1);
        await tasksA.expectUnread(tasksA.row(controlTitle));
        await expect(tasksA.row(title)).toHaveCount(0);
    });

    test('S4: ticking "Do not send me an email…" keeps the task, stops the email', async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(180_000);
        const tag = makeTag('s4', testInfo);
        const managerA = `${tag}ma`;
        const managerB = `${tag}mb`;
        const author = `${tag}au`;
        const title = `Title ${tag}`;
        const journal = await seedJournal(ojsApi, tag, [
            {username: managerA, roles: ['manager']},
            {username: managerB, roles: ['manager']},
            {username: author, roles: ['author']},
        ]);

        // Manager A ticks the email box under the needs-editor row and saves.
        const pageA = await (await asUser(managerA)).newPage();
        const profileA = await openNotificationsTab(pageA, journal.path);
        const pairA = profileA.notificationPair(NEEDS_EDITOR_SETTING);
        await expect(pairA.allow).toBeChecked();
        await pairA.email.check();
        await profileA.save();
        await expect(successToasts(pageA).filter({hasText: SAVED_MESSAGE})).toBeVisible();

        // The Author submits through the wizard.
        const authorPage = await (await asUser(author)).newPage();
        await submitViaWizard(ojsApi, authorPage, journal.path, {tag, submitter: author, title});

        // Both Managers get the task (Rule 5b).
        for (const [username, page] of [[managerA, pageA], [managerB, await (await asUser(managerB)).newPage()]]) {
            const tasks = new TasksPanel(page);
            await gotoEditorial(page, journal.path);
            await tasks.expectCount(1);
            await tasks.open();
            await expect(tasks.row(title), `${username}'s row`).toHaveCount(1);
            await tasks.expectUnread(tasks.row(title));
            await tasks.close();
        }

        // Manager B's mailbox holds the email; once it has arrived, Manager
        // A's holds none with that subject and title.
        const control = {to: emailOf(managerB), subject: NEEDS_EDITOR_SUBJECT, contains: title};
        const mailB = await pkpMail.find(control);
        expect(mailB.Subject).toBe(`${NEEDS_EDITOR_SUBJECT}: "${title}"`);
        await pkpMail.expectNone({
            to: emailOf(managerA),
            subject: NEEDS_EDITOR_SUBJECT,
            contains: title,
            afterControl: control,
        });
    });

    test("S5: unsubscribing from an email's footer link", async ({browser, baseURL, asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s5', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        const managerName = 'Mona Manager';
        const firstName = `Discussion one ${tag}`;
        const secondName = `Discussion two ${tag}`;
        const firstMessage = `Opening message one ${tag}`;
        const secondMessage = `Opening message two ${tag}`;
        const journal = await seedJournal(ojsApi, tag, [
            {username: manager, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
            {username: author, givenName: 'Alba', familyName: 'Authorson', roles: ['author']},
        ]);
        const {submissionId} = await ojsApi.createSubmission({
            tag,
            context: journal.path,
            submitter: author,
            title: `Title ${tag}`,
        });

        // The Manager opens a discussion with the Author on the Submission
        // stage's discussions panel (the Manager's own box arrives ticked,
        // the form offers no email choice).
        const managerPage = await (await asUser(manager)).newPage();
        managerPage.on('dialog', (dialog) => dialog.accept()); // the leave-page prompt after a save
        const workflow = new WorkflowPage(managerPage, journal.path);
        await workflow.gotoEditorial(submissionId);
        await addDiscussion(managerPage, {name: firstName, opener: manager, participantUsername: author, message: firstMessage});

        // The Author's email: subject the name, the Manager's name in From,
        // ending with the discussion footer whose "unsubscribe" is the link
        // and whose journal name links to the journal; the plain-text part
        // shows each link's address in parentheses after its words; the
        // Manager holds a copy (Rule 7a).
        const authorMail = await discussionEmail(pkpMail, {to: emailOf(author), name: firstName});
        expect(authorMail.summary.Subject).toBe(firstName);
        expect(authorMail.summary.From.Name).toBe(managerName);
        expect(authorMail.link, 'the footer "unsubscribe" link').toMatch(UNSUBSCRIBE_LINK);
        expect(pkpMail.extractLink(authorMail.full.HTML, journal.name), 'the journal name as a link').toMatch(
            new RegExp(`/index\\.php/${journal.path}/?$`)
        );
        expect(authorMail.full.Text).toMatch(
            new RegExp(
                `Reply to this comment at #${submissionId} Authorson \\( http\\S+ \\) or unsubscribe ` +
                    `\\( ${escapeRegExp(authorMail.link)} \\) from emails sent by ${escapeRegExp(journal.name)} ` +
                    `\\( http\\S+/index\\.php/${journal.path}/? \\)\\.`
            )
        );
        await discussionEmail(pkpMail, {to: emailOf(manager), name: firstName});

        // Signed out, the link opens the Unsubscribe page naming the Author's
        // address, every box ticked; "Unsubscribe" answers the success page;
        // no email confirms it; the link works again afterwards; three
        // broken links open the bare "404 Not Found" page (Rules 8a–8d).
        const visitor = await anonContext(browser, baseURL);
        try {
            const visitorPage = await visitor.newPage();
            const unsubscribe = new UnsubscribePage(visitorPage);
            await unsubscribe.goto(authorMail.link);
            await expect(unsubscribe.sentence()).toHaveText(
                `Select the emails that you no longer wish to receive at ${emailOf(author)} from ${journal.name}.`
            );
            const boxCount = await unsubscribe.boxes().count();
            expect(boxCount).toBe(11);
            for (let i = 0; i < boxCount; i++) {
                await expect(unsubscribe.boxes().nth(i)).toBeChecked();
            }
            const boxLabels = await unsubscribe.boxLabels();
            expect(boxLabels).toHaveLength(boxCount);
            await expect(unsubscribe.profileLink()).toBeVisible();
            await expect(unsubscribe.button()).toBeVisible();
            await unsubscribe.unsubscribe();
            await expect(unsubscribe.successHeading).toBeVisible();
            await expect(unsubscribe.resultSentence()).toContainText(
                `The email address ${emailOf(author)} has been successfully unsubscribed.`
            );
            expect(await pkpMail.count({to: emailOf(author)}), "the Author's mailbox after the press").toBe(1);
            await unsubscribe.goto(authorMail.link);
            for (let i = 0; i < boxCount; i++) {
                await expect(unsubscribe.boxes().nth(i)).toBeChecked();
            }
            const broken = UnsubscribePage.brokenLinks(authorMail.link);
            await unsubscribe.expectNotFound(broken.codeOnly);
            await unsubscribe.expectNotFound(broken.idOnly);
            await unsubscribe.expectNotFound(broken.unknownId);

            // "user profile", signed out: the Login page; signed in as the
            // Author, the journal's Profile page on "Identity" (Rule 8e).
            await unsubscribe.goto(authorMail.link);
            await unsubscribe.pressProfileLink();
            await expect(visitorPage).toHaveURL(/\/login/);
            const login = new LoginPage(visitorPage);
            await login.expectForm();
            await login.signIn(author, getPassword(author));
            const authorProfile = new ProfilePage(visitorPage, journal.path);
            await authorProfile.expectOpen('identity');
            await authorProfile.expectSelectedTab('identity');
            await expect(visitorPage).toHaveURL(new RegExp(`/${journal.path}/user/profile`));

            // The Author's tab: every email box ticked, every "Enable…"
            // ticked; no row the Unsubscribe page did not list a box for.
            await authorProfile.open('notifications');
            await expectTabState(authorProfile, {emailTicked: true});
            const sentences = await authorProfile.notificationSentences();
            expect(sentences).toHaveLength(boxCount);
            for (const sentence of sentences) {
                expect(boxLabels, `a box for "${sentence}"`).toContain(sentence);
            }

            // A second discussion: the Manager's copy arrives, the Author's
            // mailbox holds none with that name (the first is still there),
            // and the Author's Tasks window holds the new row (Rule 8c).
            await workflow.gotoEditorial(submissionId);
            await addDiscussion(managerPage, {name: secondName, opener: manager, participantUsername: author, message: secondMessage});
            await pkpMail.expectNone({
                to: emailOf(author),
                subject: secondName,
                afterControl: {to: emailOf(manager), subject: secondName},
            });
            expect(await pkpMail.count({to: emailOf(author), subject: firstName})).toBe(1);
            const authorTasks = new TasksPanel(visitorPage);
            await gotoMySubmissions(visitorPage, journal.path);
            await authorTasks.open();
            const row = authorTasks.row(secondName);
            await expect(row).toHaveCount(1);
            await expect(authorTasks.sentence(row)).toHaveText(
                DISCUSSION_TASK({creatorName: managerName, name: secondName, message: secondMessage})
            );
            await authorTasks.expectUnread(row);
        } finally {
            await visitor.close();
        }
    });

    test('S6: the link acts on the addressee, not on whoever is signed in', async ({browser, baseURL, asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s6', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        const name = `Discussion ${tag}`;
        const journal = await seedJournal(ojsApi, tag, [
            {username: manager, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
            {username: author, givenName: 'Alba', familyName: 'Authorson', roles: ['author']},
        ]);
        const {submissionId} = await ojsApi.createSubmission({
            tag,
            context: journal.path,
            submitter: author,
            title: `Title ${tag}`,
        });

        // The Manager, in a fresh session this scenario signs out and in
        // again: scenario 5's link, a discussion with the Author.
        const {context: managerContext, page: managerPage} = await freshLogin(browser, baseURL, journal.path, manager);
        try {
            managerPage.on('dialog', (dialog) => dialog.accept());
            const workflow = new WorkflowPage(managerPage, journal.path);
            await workflow.gotoEditorial(submissionId);
            await addDiscussion(managerPage, {name, opener: manager, participantUsername: author, message: `Message ${tag}`});
            const {link} = await discussionEmail(pkpMail, {to: emailOf(author), name});
            expect(link, 'the footer "unsubscribe" link').toMatch(UNSUBSCRIBE_LINK);

            // Signed in as the Manager, the page names the Author's address.
            const unsubscribe = new UnsubscribePage(managerPage);
            await unsubscribe.goto(link);
            await expect(unsubscribe.sentence()).toContainText(emailOf(author));
            await expect(unsubscribe.sentence()).not.toContainText(emailOf(manager));

            // The stale page: left open while another tab of the same browser
            // signs out; "Unsubscribe" then answers the error page (Rule 8d).
            const otherTab = await managerContext.newPage();
            await gotoEditorial(otherTab, journal.path);
            await signOut(otherTab);
            await unsubscribe.unsubscribe();
            await expect(unsubscribe.errorHeading).toBeVisible();
            await expect(unsubscribe.resultSentence()).toHaveText(STALE_PAGE_SENTENCE(emailOf(author)));

            // The link afresh: signed in as the Manager again, the page shows
            // again with the Author's address; every box but "Discussion
            // added." unticked, "Unsubscribe": the success page.
            // The sign-in returns at the dashboard's commit; the tab is closed
            // through closeTab, which waits for the renderer to have the page
            // (a close sent at the commit can be lost: support/tabs.js).
            await new LoginPage(otherTab).signIn(manager, getPassword(manager));
            await closeTab(otherTab);
            await unsubscribe.goto(link);
            await expect(unsubscribe.sentence()).toContainText(emailOf(author));
            const boxCount = await unsubscribe.boxes().count();
            expect(boxCount).toBeGreaterThan(1);
            for (let i = 0; i < boxCount; i++) {
                await unsubscribe.boxes().nth(i).uncheck();
            }
            await unsubscribe.box(`email${DISCUSSION_SETTING.charAt(0).toUpperCase()}${DISCUSSION_SETTING.slice(1)}`).check();
            await unsubscribe.unsubscribe();
            await expect(unsubscribe.successHeading).toBeVisible();

            // "user profile", signed in: the journal's Profile page on
            // "Identity", the Manager's own (Rule 8e).
            await unsubscribe.pressProfileLink();
            const managerProfile = new ProfilePage(managerPage, journal.path);
            await managerProfile.expectOpen('identity');
            await managerProfile.expectSelectedTab('identity');
            await expect(managerPage).toHaveURL(new RegExp(`/${journal.path}/user/profile`));
            await expect(managerProfile.usernameText()).toContainText(manager);

            // The Author's tab: the email box ticked on "Discussion added."
            // only, every "Enable…" ticked; the Manager's own tab is unchanged.
            const authorPage = await (await asUser(author)).newPage();
            const authorProfile = await openNotificationsTab(authorPage, journal.path);
            const allow = authorProfile.allowBoxes();
            const rows = await allow.count();
            expect(rows).toBeGreaterThan(1);
            for (let i = 0; i < rows; i++) {
                await expect(allow.nth(i)).toBeChecked();
            }
            await expect(checkedEmailBoxes(authorProfile)).toHaveCount(1);
            await expect(authorProfile.notificationPair(DISCUSSION_SETTING).email).toBeChecked();
            await managerProfile.open('notifications');
            await expectTabState(managerProfile, {emailTicked: false});
        } finally {
            await managerContext.close();
        }
    });

    test('S7: the rows, per application, and the site-level tab', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(180_000);
        // A scratch journal, so the site holds more than one journal (Rule
        // 5d), with one submission, so the Site Administrator (a Manager of
        // every scratch journal) holds an unread task of this test's own.
        const tag = makeTag('s7', testInfo);
        const title = `Title ${tag}`;
        await seedJournal(ojsApi, tag, [
            {username: `${tag}mg`, roles: ['manager']},
            {username: `${tag}au`, roles: ['author']},
        ]);

        // The Journal Manager on the seeded journal: the four groups with
        // exactly the OJS rows, every "Enable…" ticked, every email box
        // unticked (Fields).
        const managerPage = await (await asUser('manager.maya')).newPage();
        const profile = await openNotificationsTab(managerPage, JOURNAL);
        await expect(profile.notificationsIntro()).toHaveText(NOTIFICATIONS_INTRO);
        expect(await profile.notificationTable()).toEqual(OJS_TAB);
        await expectTabState(profile, {emailTicked: false});

        // The site's home page as a Manager: the bare name, no number, and
        // a bare "Dashboard" under it (Rule 4).
        await gotoSiteHome(managerPage);
        const managerHeader = new ReaderHeader(managerPage);
        await managerHeader.expectBareName('manager.maya');
        await managerHeader.open();
        await expect(managerHeader.entry('Dashboard')).toHaveText(/^\s*Dashboard\s*$/);
        await expect(managerHeader.dashboardCount()).toHaveCount(0);

        // The Site Administrator's site-level tab: the same groups without
        // "Statistics report summary." (Rule 5d).
        const adminPage = await (await asUser('admin')).newPage();
        const siteProfile = new ProfilePage(adminPage, null);
        await siteProfile.goto('notifications');
        await expect(adminPage).toHaveURL(/\/index\/(en\/)?user\/profile/);
        expect(await siteProfile.notificationTable()).toEqual(SITE_TAB);

        // The scratch journal's submission, seeded right before the reads
        // below: the window lists only `admin`'s 25 newest tasks, and
        // parallel tests raise several a second, so a task raised at the
        // start of the test can be off that page by now (fix list B).
        await ojsApi.createSubmission({tag, context: tag, submitter: `${tag}au`, title});

        // The site-level bell: the same "Tasks" window with the same rows as
        // from a journal's editorial page (Rule 2d). The list moves while
        // parallel workers seed, so the pair of reads is repeated until it
        // agrees. The rows are compared sorted: the window orders by creation
        // time alone, so rows parallel workers raised in the same second come
        // back in no fixed order between two reads (ci-triage, 2026-09-15).
        // The window shows the first 25 of `admin`'s thousands of tasks, so a
        // row tied at the 25th place is on one read's page and not the
        // other's: each read keeps this test's own rows (fix list B,
        // flake-s26).
        const adminTasks = new TasksPanel(adminPage);
        const sorted = (rows) => [...rows].sort();
        const ownRows = (rows) => sorted(rows.filter((row) => row.endsWith(` | ${title}`)));
        let journalRows = [];
        let siteRows = [];
        for (let attempt = 0; attempt < 3; attempt++) {
            await gotoEditorial(adminPage, JOURNAL);
            journalRows = ownRows(await readTaskRows(adminPage));
            await siteProfile.goto('notifications');
            await expect(adminTasks.bell()).toBeVisible({timeout: 30_000});
            siteRows = ownRows(await readTaskRows(adminPage));
            if (JSON.stringify(siteRows) === JSON.stringify(journalRows)) {
                break;
            }
        }
        expect(siteRows.length).toBeGreaterThan(0);
        expect(siteRows).toEqual(journalRows);
        expect(siteRows).toContain(`${NEEDS_EDITOR_TASK} | ${title}`);

        // Control: on the site's own home page the Site Administrator's name
        // is bare too, and "Dashboard" under it carries the number the bell
        // shows (Rule 4); again a moving count, read as a pair. The number
        // is read as the entry's text: at a desktop-width window the theme
        // keeps it in the page but does not show it (finding T-ojs-1 of this
        // revision's run, `.reports/U05/test-ojs-findings.md`), so its
        // visibility is neither asserted nor denied here.
        // The entry is read between two reads of the bell and must fall in
        // their range (equal to both when nothing moved): parallel tests
        // raise and clear `admin`'s tasks several times a second (fix list
        // B, flake-s26).
        const adminHeader = new ReaderHeader(adminPage);
        const readBell = async () => {
            await siteProfile.goto('notifications');
            await expect(adminTasks.bell()).toBeVisible({timeout: 30_000});
            return adminTasks.count();
        };
        let range = [];
        let dashboardCount = -2;
        for (let attempt = 0; attempt < 3; attempt++) {
            const before = await readBell();
            await gotoSiteHome(adminPage);
            await adminHeader.expectBareName('admin');
            await adminHeader.open();
            await expect(adminHeader.dashboardCount()).toHaveCount(1);
            dashboardCount = Number((await adminHeader.dashboardCount().textContent()).trim());
            await expect(adminHeader.entry('Dashboard')).toHaveText(new RegExp(`^\\s*Dashboard\\s+${dashboardCount}\\s*$`));
            const after = await readBell();
            range = [Math.min(before, after), Math.max(before, after)];
            if (dashboardCount >= range[0] && dashboardCount <= range[1]) {
                break;
            }
        }
        expect(range[0]).toBeGreaterThan(0);
        expect(dashboardCount, `between the bell's ${range[0]} and ${range[1]}`).toBeGreaterThanOrEqual(range[0]);
        expect(dashboardCount, `between the bell's ${range[0]} and ${range[1]}`).toBeLessThanOrEqual(range[1]);
    });

    test('S8: registration presets the email choice', async ({browser, baseURL, asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(180_000);
        const tag = makeTag('s8', testInfo);
        const manager = `${tag}mg`;
        const journal = await seedJournal(ojsApi, tag, [{username: manager, roles: ['manager']}]);

        /** Register a visitor on the scratch journal; they land signed in. */
        const registerVisitor = async (username, {notify}) => {
            const context = await anonContext(browser, baseURL);
            const page = await context.newPage();
            const register = new RegisterPage(page, journal.path);
            await register.goto();
            await register.expectForm();
            await register.fillProfile({givenName: 'Vera', familyName: 'Visitor'});
            await register.fillLogin({email: emailOf(username), username, password: getPassword(username)});
            await register.privacyConsent.check();
            await expect(register.emailConsent).not.toBeChecked();
            if (notify) {
                await register.emailConsent.check();
            }
            await register.submitButton.click();
            await new RegistrationCompletePage(page).expectOpen();
            return {context, page};
        };

        // The first visitor leaves "Yes, I would like to be notified…"
        // unticked: every Public Announcements row has both boxes ticked;
        // the other rows are at their defaults (Rule 5e).
        const firstUsername = `${tag}r1`;
        const first = await registerVisitor(firstUsername, {notify: false});
        try {
            const profile = await openNotificationsTab(first.page, journal.path);
            for (const setting of PUBLIC_SETTINGS) {
                const pair = profile.notificationPair(setting);
                await expect(pair.allow).toBeChecked();
                await expect(pair.email).toBeChecked();
            }
            await expect(checkedEmailBoxes(profile)).toHaveCount(PUBLIC_SETTINGS.length);
            const allow = profile.allowBoxes();
            for (let i = 0; i < (await allow.count()); i++) {
                await expect(allow.nth(i)).toBeChecked();
            }

            // The reader-side header: the new account (a Reader) sees the
            // bare name on the journal's home page (Rule 4); the journal's
            // Manager, read the same way, sees "{name} 0".
            await gotoHome(first.page, journal.path);
            await new ReaderHeader(first.page).expectBareName(firstUsername);
            const managerPage = await (await asUser(manager)).newPage();
            await gotoHome(managerPage, journal.path);
            await new ReaderHeader(managerPage).expectCount(manager, 0);
        } finally {
            await first.context.close();
        }

        // The second visitor ticks the box: every box at its default.
        const second = await registerVisitor(`${tag}r2`, {notify: true});
        try {
            const profile = await openNotificationsTab(second.page, journal.path);
            await expectTabState(profile, {emailTicked: false});
        } finally {
            await second.context.close();
        }
    });

    test('S10: a published version raises a task for the Author', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s10', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        const title = `Title ${tag}`;
        const journal = await seedJournal(ojsApi, tag, [
            {username: manager, roles: ['manager']},
            {username: author, roles: ['author']},
        ]);
        // The Author's submission, its version just published (the seed
        // raises the Author's task and the Managers' "needs an editor" task;
        // note s10).
        await ojsApi.createSubmission({tag, context: journal.path, submitter: author, title, submitted: true, published: true});

        // The bell: "1" on the Author's editorial page (Rule 2a).
        const authorPage = await (await asUser(author)).newPage();
        const tasks = new TasksPanel(authorPage);
        await gotoMySubmissions(authorPage, journal.path);
        await tasks.expectCount(1);

        // The window: one bold row opening "A new version of your
        // submission", the row's full wording carrying the title in place of
        // "Title" (Rules 2b, 6). The bullet's "with the submission's title
        // under it" is not asserted: the row shows no title line under the
        // sentence (finding T-ojs-2 of this revision's run,
        // `.reports/U05/test-ojs-findings.md`); the Manager's row below,
        // which does carry one, is read the same way as the control.
        await tasks.open();
        await expect(tasks.rows()).toHaveCount(1);
        const row = tasks.rows().first();
        await tasks.expectUnread(row);
        await expect(tasks.sentence(row)).toHaveText(VERSION_PUBLISHED_OPENING);
        await expect(tasks.sentence(row)).toHaveText(VERSION_PUBLISHED_TASK(title));

        // Control: the Manager's window holds the "needs an editor" row for
        // the title and none opening "A new version of your submission".
        const managerPage = await (await asUser(manager)).newPage();
        const managerTasks = new TasksPanel(managerPage);
        await gotoEditorial(managerPage, journal.path);
        await managerTasks.open();
        await expect(managerTasks.row(title)).toHaveCount(1);
        await expect(managerTasks.sentence(managerTasks.row(title))).toHaveText(NEEDS_EDITOR_TASK);
        await expect(managerTasks.title(managerTasks.row(title))).toHaveText(title);
        await expect(managerTasks.rowsOpening(VERSION_PUBLISHED_OPENING)).toHaveCount(0);
    });

    test('S11: the review-complete email goes to the assigned editors alone', async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(180_000);
        const tag = makeTag('s11', testInfo);
        const manager = `${tag}mg`;
        const sectionEditor = `${tag}se`;
        const author = `${tag}au`;
        const reviewer = `${tag}rv`;
        const title = `Title ${tag}`;
        const journal = await seedJournal(ojsApi, tag, [
            {username: manager, roles: ['manager']},
            {username: sectionEditor, givenName: 'Sena', familyName: 'Sectioneditor', roles: ['sectionEditor']},
            {username: author, givenName: 'Alba', familyName: 'Authorson', roles: ['author']},
            {username: reviewer, givenName: 'Rita', familyName: 'Reviewer', roles: ['externalReviewer']},
        ]);
        // In review, the Reviewer's request accepted, the Section Editor
        // assigned, the Journal Manager not (note s11).
        const {submissionId} = await ojsApi.createSubmission({
            tag,
            context: journal.path,
            submitter: author,
            title,
            decisions: ['sendExternalReview'],
            reviewRounds: [{reviewers: [{username: reviewer, status: 'accepted'}]}],
            participants: [{username: sectionEditor, role: 'sectionEditor'}],
        });

        // The Reviewer opens the review from the reviewer dashboard and walks
        // it to "Submit Review" with "Accept Submission", "OK" to the
        // question (Reviewer's review).
        const reviewerPage = await (await asUser(reviewer)).newPage();
        const list = new ReviewerAssignmentsPage(reviewerPage, journal.path);
        await list.goto('actionRequired');
        const listRow = list.row(title);
        await expect(listRow).toHaveCount(1);
        await list.openWizard(listRow, 'Finish review');
        const wizard = new ReviewWizardPage(reviewerPage, journal.path);
        await wizard.expectOpen(title);
        await wizard.expectStep(1);
        await wizard.saveAndContinueButton.click();
        await wizard.expectStep(2);
        await wizard.continueToStep3();
        await wizard.chooseRecommendation('Accept Submission');
        const confirm = await wizard.pressSubmitReview();
        await expect(confirm).toContainText('Are you sure you want to submit this review?');
        await confirm.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(confirm).toBeHidden({timeout: 30_000});
        await wizard.expectCompleted();

        // The Section Editor's mailbox: the review-complete email, ending
        // with the automated-message footer whose "unsubscribe" is the link
        // (Rules 6, 7a).
        const control = {to: emailOf(sectionEditor), subject: REVIEW_COMPLETE_SUBJECT, contains: title};
        const summary = await pkpMail.find(control);
        expect(summary.Subject).toBe(
            `Review complete: Rita Reviewer recommends Accept Submission for #${submissionId} Authorson — "${title}"`
        );
        const full = await pkpMail.fullMessage(summary.ID);
        const link = pkpMail.extractLink(full.HTML, /^unsubscribe$/i);
        expect(link, 'the footer "unsubscribe" link').toMatch(UNSUBSCRIBE_LINK);
        expect(full.Text).toMatch(
            new RegExp(
                `This is an automated message from ${escapeRegExp(journal.name)} \\( http\\S+ \\)\\. ` +
                    `You can unsubscribe \\( ${escapeRegExp(link)} \\) from this email at any time\\.`
            )
        );

        // No task: the Section Editor's Tasks window gains no row for it
        // (Rule 6); the Manager's window, read the same way, holds the
        // "needs an editor" row the same submission raised.
        const editorPage = await (await asUser(sectionEditor)).newPage();
        const editorTasks = new TasksPanel(editorPage);
        await gotoEditorial(editorPage, journal.path);
        await editorTasks.open();
        await expect(editorTasks.noItems().or(editorTasks.rows().first())).toBeVisible();
        await expect(editorTasks.row(title)).toHaveCount(0);
        await expect(editorTasks.rowsOpening(/review/i)).toHaveCount(0);
        const managerPage = await (await asUser(manager)).newPage();
        const managerTasks = new TasksPanel(managerPage);
        await gotoEditorial(managerPage, journal.path);
        await managerTasks.open();
        await expect(managerTasks.row(title)).toHaveCount(1);
        await expect(managerTasks.sentence(managerTasks.row(title))).toHaveText(NEEDS_EDITOR_TASK);

        // Control: once the Section Editor's email has arrived, the Journal
        // Manager's mailbox holds no email with that subject (Rule 6).
        await pkpMail.expectNone({
            to: emailOf(manager),
            subject: REVIEW_COMPLETE_SUBJECT,
            contains: title,
            afterControl: control,
        });
    });
});
