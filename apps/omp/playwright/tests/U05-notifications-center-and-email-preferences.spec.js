// @ts-check
/**
 * @file playwright/tests/U05-notifications-center-and-email-preferences.spec.js
 *
 * Notifications center & email preferences — OMP suite, one test per
 * canonical scenario the spec runs on a press (scenarios 1–8, 10 and 11,
 * read with the spec's press vocabulary: press, Press Manager, "A new
 * monograph has been submitted to which an editor needs to be assigned.",
 * "New announcement.", "Desk Review Tasks & Discussions"). Scenario 9 is
 * OJS-only (a press has no issues and no issue row): the spec's absence
 * sentence is asserted where S7 reads the press's exact row list, and this
 * suite has no serial half.
 * Spec: docs/specs/U05-notifications-center-and-email-preferences.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A1 🐞,
 * A2 🐞, A3 🐞, A10 🐞, A4 ❓, A5 ❓, A6 ❓, A7 ❓, A8 ❓, A9 ❓, A11 ❓; the
 * OPS-only OPS1, OPS2 and OPS3 do not arise on a press. Where a test passes
 * through one it asserts the effect the spec states and leaves the
 * finding's own claim unasserted either way: S3 reads Manager B's email as
 * the control and never Manager A's mailbox (A10); S5 and S6 unsubscribe
 * accounts whose tab is at its defaults (A2); the "needs an editor" email
 * is asserted by subject only, its footer neither asserted nor denied
 * (A8); no reader-side count is read for a Series Editor (A3); the
 * site-level tab is read and never saved (A4). S11 asserts the
 * review-complete subject's shape with the recommendation word read
 * loosely, because *Reviewer's review*'s register (U28 OMP2 🐞) describes
 * the press's "recommends None" and PRINCIPLES M3 forbids freezing it.
 * The spec's Coverage section records everything else left out.
 *
 * Isolation: every test seeds its own scratch press with throwaway accounts
 * through the scenario endpoint (unique tags naming the app, at most 13
 * characters, so no password reaches the Register page's 32-character cap);
 * `publicknowledge` and the roster are only read (S7). Where the scenario
 * needs the "needs an editor" EMAIL, the Author submits through the wizard
 * from a seeded draft (a seeded `submitted: true` submission raises the task
 * but sends no email, seed-facts; the press wizard asks no abstract); where
 * only the task is needed, the seed suffices. Mailpit reads are scoped by
 * the throwaway recipient (PRINCIPLES A8) and every silence claim rides on a
 * positive control. The bell's number is asserted on a freshly loaded page
 * or after the window closed, never on the page that was open when the task
 * was raised (Rule 2a). Every sign-in that a scenario ends (S6's sign-out
 * in another tab) or that a signed-out page leads to (S5's "user profile")
 * happens in the test's own fresh browser context through the real Login
 * form, never through the shared .auth cache. S5 and S6 save a discussion
 * from the workflow page, which on a press works only with the campaign's
 * overlay class mounted (docs/tracking/app-changes.md row 12; `npm run
 * mount`, CI mounts it too); leaving the workflow page afterwards raises
 * the browser's leave-page prompt, so both tests answer it. S7's admin
 * reads (the site-level window's rows, the site home's "Dashboard" number)
 * are re-read together when a parallel worker's seed lands between two
 * reads, because `admin` is a Press Manager of every scratch press. No
 * hard-coded waits: S3's "stays while the pointer rests on it" is bounded
 * by a third toast's own disappearance.
 */
const {test, expect} = require('../support/fixtures.js');
const {ProfilePage, SAVED_MESSAGE} = require('../../../../shared/playwright/pages/ProfilePage.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {ReviewerAssignmentsPage, ReviewWizardPage} = require('../../../../shared/playwright/pages/ReviewerPages.js');
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
const {disableMotion} = require('../../../../shared/playwright/support/motion.js');
const {
    wizardUrl,
    expectWizardOpen,
    completeAndSubmitDraft,
} = require('../pages/SubmissionWizardPages.js');
const {RegisterPage, RegistrationCompletePage} = require('../pages/RegistrationPages.js');
const {getPassword} = require('../../../../shared/playwright/data/users.js');
const {unordered} = require('../../../../shared/playwright/support/order.js');

const PRESS = 'publicknowledge';
const NEEDS_EDITOR_TASK = 'A new monograph has been submitted to which an editor needs to be assigned.';
const NEEDS_EDITOR_SUBJECT = 'A new submission needs an editor to be assigned';
const NEEDS_EDITOR_SETTING = 'notificationEditorAssignmentRequired';
const DISCUSSION_SETTING = 'notificationNewQuery';
const DISCUSSIONS_PANEL = 'Desk Review Tasks & Discussions';
const NEW_VERSION_OPENING = 'A new version of your submission';
const REVIEW_COMPLETE_SUBJECT = 'Review complete';
const UNSUBSCRIBE_ERROR = (email) =>
    `There was an unexpected error and we could not unsubscribe the email address ${email}. You can unsubscribe from all email notifications in your user profile or contact us directly for help.`;
const NOTIFICATIONS_INTRO =
    'Select the system events that you wish to be notified about. Unchecking an item will prevent notifications of the event from showing up in the system and also from being emailed to you. Checked events will appear in the system and you have an extra option to receive or not the same notification by email.';

/** The tab's groups and rows on a press (Fields). */
const OMP_TAB = [
    {group: 'Public Announcements', rows: ['New announcement.']},
    {
        group: 'Submission Events',
        rows: [
            'A new monograph, "Title," has been submitted.',
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
const SITE_TAB = OMP_TAB.map((entry) =>
    entry.group === 'Editors' ? {group: entry.group, rows: ['Weekly email of outstanding tasks']} : entry
);

/**
 * The Unsubscribe page's boxes on a press, in the page's own order (Fields:
 * the OJS list without the two issue boxes, the announcement box seventh).
 */
const OMP_UNSUBSCRIBE_BOXES = [
    'A new monograph, "Title," has been submitted.',
    'A new version of your submission, "Title", was published.',
    NEEDS_EDITOR_TASK,
    'A reviewer has commented on "Title".',
    'Discussion added.',
    'Discussion activity.',
    'New announcement.',
    'Weekly email of outstanding tasks',
    'Statistics report summary.',
];

/** The Public Announcements rows' setting names on a press (Rule 5e, note s8). */
const PUBLIC_SETTINGS = ['notificationNewAnnouncement'];

/**
 * Unique per-run tag: a single alphanumeric token naming the feature, the
 * app, the scenario and the worker, plus a random part; at most 13
 * characters (a throwaway username is the tag plus two letters, and its
 * password the username twice: under the Register page's 32-character cap).
 */
function makeTag(scenario, testInfo) {
    return `u5omp${scenario}w${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 6)}`;
}

const emailOf = (username) => `${username}@mail.test`;
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A scratch press with the named throwaway accounts. `admin` is auto-
 * enrolled as a Press Manager too (seed-facts) and gets every Manager task,
 * which touches nothing these tests assert.
 */
async function seedPress(ompApi, tag, users) {
    await ompApi.createContext({tag, users});
    return {path: tag, name: `Scratch context ${tag}`};
}

/**
 * The Author submits: from a seeded draft (the title rides in from the
 * seed; a new press has no series, so nobody is assigned), the wizard is
 * driven from Upload Files to the footer's "Submit" and the dialog's
 * "Submit". The wizard's own request sends the "needs an editor" email.
 */
async function submitViaWizard(ompApi, authorPage, pressPath, {tag, submitter, title}) {
    const {submissionId} = await ompApi.createSubmission({
        tag,
        context: pressPath,
        submitter,
        title,
        submitted: false,
        participants: [],
    });
    await authorPage.goto(wizardUrl(pressPath, submissionId));
    await expectWizardOpen(authorPage);
    await completeAndSubmitDraft(authorPage, `ms-${tag}.txt`);
    return submissionId;
}

/** The editorial dashboard of a press (any editorial page carries the bell). */
async function gotoEditorial(page, pressPath) {
    await page.goto(`/index.php/${pressPath}/dashboard/editorial`);
    await expect(new TasksPanel(page).bell()).toBeVisible({timeout: 30_000});
}

/** The Author's editorial page (My Submissions carries the bell too). */
async function gotoMySubmissions(page, pressPath) {
    await page.goto(`/index.php/${pressPath}/dashboard/mySubmissions`);
    await expect(new TasksPanel(page).bell()).toBeVisible({timeout: 30_000});
}

/** Open the Notifications tab for the signed-in account on a press. */
async function openNotificationsTab(page, pressPath) {
    const profile = new ProfilePage(page, pressPath);
    await profile.goto('notifications');
    return profile;
}

/** The press's home page as the signed-in account (the reader-side header). */
async function gotoPressHome(page, pressPath) {
    await page.goto(`/index.php/${pressPath}/index`);
    const header = new ReaderHeader(page);
    await expect(header.toggle).toBeVisible({timeout: 30_000});
    return header;
}

/** The site's own home page as the signed-in account (the reader-side header). */
async function gotoSiteHome(page) {
    await page.goto('/index.php/index/index');
    const header = new ReaderHeader(page);
    await expect(header.toggle).toBeVisible({timeout: 30_000});
    return header;
}

/**
 * The entries under the name, read in the DOM before the name is pressed
 * (hidden until then; `textContent`), so the read leaves the page as it is.
 */
async function hiddenMenuEntries(header) {
    const texts = await header.menu.locator('a').allTextContents();
    return texts.map((text) => text.replace(/\s+/g, ' ').trim());
}

/**
 * Read two things that must agree and re-read both when they do not: a
 * parallel worker's seed may raise a task for `admin` between the two
 * reads (S7). Fails with the last pair after three tries.
 */
async function expectAgreeing(readFirst, readSecond, {label}) {
    let first;
    let second;
    for (let attempt = 0; attempt < 3; attempt++) {
        first = await readFirst();
        second = await readSecond();
        if (JSON.stringify(first) === JSON.stringify(second)) {
            return first;
        }
    }
    expect(second, label).toEqual(first);
    return first;
}

/**
 * A number read between two reads of a moving count lies within them:
 * parallel tests raise and clear `admin`'s tasks several times a second
 * (S7), so the "Dashboard" entry is read between two reads of the bell and
 * must fall in their range (equal to both when nothing moved). Three tries
 * (fix list B, flake-s26: the pair of reads alone disagreed on all three
 * tries in 2 of 5 OPS runs at eight workers).
 */
async function expectBetweenReads(readCount, readOther, {label}) {
    let range = [];
    let other;
    for (let attempt = 0; attempt < 3; attempt++) {
        const before = await readCount();
        other = await readOther();
        const after = await readCount();
        range = [Math.min(before, after), Math.max(before, after)];
        if (other >= range[0] && other <= range[1]) {
            return other;
        }
    }
    expect(other, `${label} (between ${range[0]} and ${range[1]})`).toBeGreaterThanOrEqual(range[0]);
    expect(other, `${label} (between ${range[0]} and ${range[1]})`).toBeLessThanOrEqual(range[1]);
    return other;
}

/**
 * The Manager opens a discussion with the Author (scenario 5's labels):
 * "Add" in the "Desk Review Tasks & Discussions" panel, a "Name", the
 * Author's box under "Participants" (the Manager's own box arrives ticked;
 * the form offers no email choice), a message, "Save". Waits for the save
 * (`POST …/submissions/{id}/tasks`).
 */
async function addDiscussion(managerPage, {name, participantUsername, ownUsername, message}) {
    const panel = managerPage.locator('[data-cy="discussion-manager"]').first();
    await expect(panel.getByRole('heading', {name: DISCUSSIONS_PANEL})).toBeVisible({timeout: 30_000});
    await panel.getByRole('button', {name: 'Add', exact: true}).click();
    // The workflow page is itself an active side modal; the form is the one
    // stacked over it that carries the "Name" box.
    const modal = managerPage
        .locator('[data-cy="active-modal"]')
        .filter({has: managerPage.locator('input[name="title"]')});
    await modal.locator('input[name="title"]').fill(name);
    // The participant boxes render a moment after the form opens.
    const participantBox = modal.getByRole('checkbox', {name: new RegExp(participantUsername)});
    await expect(participantBox).toBeVisible({timeout: 30_000});
    await expect(participantBox).not.toBeChecked();
    // The Manager's own box arrives ticked, and no box or choice on the
    // form is about email (the participant boxes are the control).
    await expect(modal.getByRole('checkbox', {name: new RegExp(ownUsername)})).toBeChecked();
    await expect(modal.getByRole('checkbox', {name: /e-?mail/i})).toHaveCount(0);
    await expect(modal.getByRole('radio', {name: /e-?mail/i})).toHaveCount(0);
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

/** A fresh, explicitly-anonymous context (never inherits cached storage state). */
async function anonContext(browser, baseURL) {
    const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
    await disableMotion(context);
    return context;
}

/** Sign in through the press's own Login form in the test's own context. */
async function signInAtPress(page, pressPath, username) {
    const login = new LoginPage(page);
    await login.gotoContext(pressPath);
    await login.expectForm();
    await login.signIn(username, getPassword(username));
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

test.describe('notifications center & email preferences', () => {
    test('S1: a submission raises a task, and the bell counts it', {tag: '@smoke'}, async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        const title = `Title ${tag}`;
        const press = await seedPress(ompApi, tag, [
            {username: manager, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
            {username: author, givenName: 'Alba', familyName: 'Authorson', roles: ['author']},
        ]);

        // The Manager's page is open before the submission: no number.
        const managerPage = await (await asUser(manager)).newPage();
        const tasks = new TasksPanel(managerPage);
        await gotoEditorial(managerPage, press.path);
        await tasks.expectCount(0);

        // The Author submits through the wizard.
        const authorPage = await (await asUser(author)).newPage();
        const submissionId = await submitViaWizard(ompApi, authorPage, press.path, {tag, submitter: author, title});

        // Bounded by the Manager's own email, the page open before the
        // submission still shows no number; a reload shows "1" (Rule 2a).
        await pkpMail.find({to: emailOf(manager), subject: NEEDS_EDITOR_SUBJECT, contains: title});
        await tasks.expectCount(0);
        await managerPage.reload();
        await tasks.expectCount(1);

        // The reader-side count: on the press's home page the name reads
        // "{name} 1"; under it "Dashboard" and "View Profile" and no list
        // of tasks (Rule 4).
        let header = await gotoPressHome(managerPage, press.path);
        await header.expectCount(manager, 1);
        await header.open();
        const entries = await header.entryTexts();
        expect(entries.map((entry) => entry.replace(/\s+\d+$/, ''))).toEqual(['Dashboard', 'View Profile', 'Logout']);
        expect(entries.some((entry) => entry.includes(NEEDS_EDITOR_TASK) || entry.includes(title))).toBe(false);
        await expect(header.wrapper).not.toContainText(title);

        // The window: one bold row with the sentence and the title; the bell
        // greyed out with no number while it is open (Rules 2a, 2b).
        await gotoEditorial(managerPage, press.path);
        await tasks.expectCount(1);
        await tasks.open();
        await expect(tasks.rows()).toHaveCount(1);
        const row = tasks.rows().first();
        await tasks.expectUnread(row);
        await expect(tasks.sentence(row)).toHaveText(NEEDS_EDITOR_TASK);
        await expect(tasks.title(row)).toHaveText(title);
        await expect(tasks.bell()).toBeDisabled();
        await expect(tasks.bell()).toHaveText(/^\s*Tasks\s*$/);

        // The blank part of the row (the task cell's corner, outside the
        // row's one link): nothing happens; the window stays on the same
        // address, the row is still bold, its box unticked (Rule 2c).
        await tasks.pressBlankPart(row);
        await expect(tasks.rows()).toHaveCount(1);
        await tasks.expectUnread(row);
        await expect(tasks.box(row)).not.toBeChecked();
        await expect(managerPage).not.toHaveURL(/workflowSubmissionId/);

        // Pressing the text opens the submissions dashboard with the workflow
        // in a panel headed with the Author's name and the title (Rule 2c).
        await tasks.openTask(row);
        await managerPage.waitForURL(new RegExp(`/${press.path}/dashboard/editorial\\?.*workflowSubmissionId=${submissionId}`), {
            waitUntil: 'commit',
            timeout: 30_000,
        });
        const workflow = new WorkflowPage(managerPage, press.path);
        await workflow.expectOpen(submissionId);
        await expect(workflow.header()).toContainText('Authorson');
        await expect(workflow.titleLine()).toContainText(title);

        // Back on an editorial page: no number; the row is read now; the
        // press's home page reads "{name} 0" (Rule 4, Side effects).
        await gotoEditorial(managerPage, press.path);
        await tasks.expectCount(0);
        await tasks.open();
        await expect(tasks.rows()).toHaveCount(1);
        await tasks.expectRead(tasks.row(title));
        await tasks.close();
        header = await gotoPressHome(managerPage, press.path);
        await header.expectCount(manager, 0);
    });

    test('S2: Mark New, Mark Read, Delete', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const manager = `${tag}mg`;
        const otherManager = `${tag}m2`;
        const author = `${tag}au`;
        const press = await seedPress(ompApi, tag, [
            {username: manager, roles: ['manager']},
            {username: otherManager, roles: ['manager']},
            {username: author, roles: ['author']},
        ]);
        // Two submissions, the second later (a seeded submission raises the
        // same task the wizard does; no email is needed here). The window
        // orders rows by the task's creation time at one-second
        // granularity (note s2), so two seeds inside the same second tie
        // and come in either order (seen once, run 1 of 2026-09-13): the
        // second seed waits for the clock's next second, the condition the
        // order depends on, never a guessed delay.
        const titles = [`First ${tag}`, `Second ${tag}`];
        await ompApi.createSubmission({tag, context: press.path, submitter: author, title: titles[0]});
        const firstSeededAt = Date.now(); // the task is stamped at the end of the request
        while (Math.floor(Date.now() / 1000) <= Math.floor(firstSeededAt / 1000)) {
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
        await ompApi.createSubmission({tag, context: press.path, submitter: author, title: titles[1]});

        const managerPage = await (await asUser(manager)).newPage();
        const tasks = new TasksPanel(managerPage);
        await gotoEditorial(managerPage, press.path);
        await tasks.expectCount(2);

        // Newest first: the first row carries the later submission's title,
        // the second row the earlier one's (Rule 2b); both unread.
        await tasks.open();
        await expect(tasks.rows()).toHaveCount(2);
        await expect(tasks.title(tasks.rows().nth(0))).toHaveText(titles[1]);
        await expect(tasks.title(tasks.rows().nth(1))).toHaveText(titles[0]);
        await tasks.expectUnread(tasks.row(titles[0]));
        await tasks.expectUnread(tasks.row(titles[1]));

        // "Mark Read" with nothing ticked changes nothing.
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

        // Control: the second Press Manager's own window still lists both
        // rows for the same submissions (Actors & permissions).
        const otherPage = await (await asUser(otherManager)).newPage();
        const otherTasks = new TasksPanel(otherPage);
        await gotoEditorial(otherPage, press.path);
        await otherTasks.expectCount(2);
        await otherTasks.open();
        await expect(otherTasks.rows()).toHaveCount(2);
        await expect(otherTasks.row(titles[0])).toHaveCount(1);
        await expect(otherTasks.row(titles[1])).toHaveCount(1);
    });

    test('S3: unticking "Enable…" stops the task, not the email', async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(180_000);
        const tag = makeTag('s3', testInfo);
        const managerA = `${tag}ma`;
        const managerB = `${tag}mb`;
        const author = `${tag}au`;
        const priorTitle = `Prior ${tag}`;
        const title = `Title ${tag}`;
        const secondTitle = `Later ${tag}`;
        const press = await seedPress(ompApi, tag, [
            {username: managerA, roles: ['manager']},
            {username: managerB, roles: ['manager']},
            {username: author, roles: ['author']},
        ]);
        // An earlier submission, so both Managers hold a row already (note s3).
        await ompApi.createSubmission({tag, context: press.path, submitter: author, title: priorTitle});

        // Manager A unticks "Enable…" under the needs-editor row: the email
        // box greys out; "Save" shows the success toast at the top right.
        const pageA = await (await asUser(managerA)).newPage();
        const profileA = await openNotificationsTab(pageA, press.path);
        const pairA = profileA.notificationPair(NEEDS_EDITOR_SETTING);
        await pairA.allow.uncheck();
        await expect(pairA.email).toBeDisabled();
        await profileA.save();
        const toasts = successToasts(pageA).filter({hasText: SAVED_MESSAGE});
        await expect(toasts).toHaveCount(1);
        await expect(toasts.first()).toBeVisible();

        // The toast (Rule 9): "Save" again at once stacks a second toast
        // under the first; the first toast's "×" removes it; the other stays
        // while the pointer rests on it, past its own lifetime, and
        // disappears by itself once the pointer leaves.
        await profileA.save();
        await expect(toasts).toHaveCount(2);
        await expectStackedBelow(toasts.nth(0), toasts.nth(1));
        await toastCloseButton(toasts.nth(0)).click();
        await expect(toasts).toHaveCount(1);
        await expectStaysWhileHovered(pageA, toasts.first());
        await expect(toasts).toHaveCount(0);

        // The Author submits through the wizard (the email is needed).
        const authorPage = await (await asUser(author)).newPage();
        await submitViaWizard(ompApi, authorPage, press.path, {tag, submitter: author, title});

        // Manager B's window gains the row and the bell "2".
        const pageB = await (await asUser(managerB)).newPage();
        const tasksB = new TasksPanel(pageB);
        await gotoEditorial(pageB, press.path);
        await tasksB.expectCount(2);
        await tasksB.open();
        await expect(tasksB.row(title)).toHaveCount(1);
        await tasksB.expectUnread(tasksB.row(title));

        // Manager B's mailbox holds the email (the control that bounds A's
        // window read).
        await pkpMail.find({to: emailOf(managerB), subject: NEEDS_EDITOR_SUBJECT, contains: title});

        // Manager A's window gains no row for this title and the bell stays
        // at "1" (the earlier row stays; Rule 5a).
        const tasksA = new TasksPanel(pageA);
        await gotoEditorial(pageA, press.path);
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
        await gotoEditorial(pageA, press.path);
        await tasksA.expectCount(1);
        await tasksA.open();
        await expect(tasksA.row(priorTitle)).toHaveCount(1);
        await expect(tasksA.row(title)).toHaveCount(0);
        await tasksA.close();

        // Control: the Author submits again (the seed raises the row; only
        // the row is read): Manager A's window gains the row for this second
        // submission and the bell reads "2"; re-ticking brings back future
        // events only (Rule 5a).
        await ompApi.createSubmission({tag, context: press.path, submitter: author, title: secondTitle});
        await gotoEditorial(pageA, press.path);
        await tasksA.expectCount(2);
        await tasksA.open();
        await expect(tasksA.row(secondTitle)).toHaveCount(1);
        await tasksA.expectUnread(tasksA.row(secondTitle));
        await expect(tasksA.row(title)).toHaveCount(0);
    });

    test('S4: ticking "Do not send me an email…" keeps the task, stops the email', async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(180_000);
        const tag = makeTag('s4', testInfo);
        const managerA = `${tag}ma`;
        const managerB = `${tag}mb`;
        const author = `${tag}au`;
        const title = `Title ${tag}`;
        const press = await seedPress(ompApi, tag, [
            {username: managerA, roles: ['manager']},
            {username: managerB, roles: ['manager']},
            {username: author, roles: ['author']},
        ]);

        // Manager A ticks the email box under the needs-editor row and saves.
        const pageA = await (await asUser(managerA)).newPage();
        const profileA = await openNotificationsTab(pageA, press.path);
        const pairA = profileA.notificationPair(NEEDS_EDITOR_SETTING);
        await expect(pairA.allow).toBeChecked();
        await pairA.email.check();
        await profileA.save();
        await expect(successToasts(pageA).filter({hasText: SAVED_MESSAGE})).toBeVisible();

        // The Author submits through the wizard.
        const authorPage = await (await asUser(author)).newPage();
        await submitViaWizard(ompApi, authorPage, press.path, {tag, submitter: author, title});

        // Both Managers get the task (Rule 5b).
        for (const [username, page] of [[managerA, pageA], [managerB, await (await asUser(managerB)).newPage()]]) {
            const tasks = new TasksPanel(page);
            await gotoEditorial(page, press.path);
            await tasks.expectCount(1);
            await tasks.open();
            await expect(tasks.row(title), `${username}'s row`).toHaveCount(1);
            await tasks.expectUnread(tasks.row(title));
            await tasks.close();
        }

        // Manager B's mailbox holds the email; once it has arrived, Manager
        // A's holds none with that subject and title.
        const control = {to: emailOf(managerB), subject: NEEDS_EDITOR_SUBJECT, contains: title};
        await pkpMail.find(control);
        await pkpMail.expectNone({
            to: emailOf(managerA),
            subject: NEEDS_EDITOR_SUBJECT,
            contains: title,
            afterControl: control,
        });
    });

    test("S5: unsubscribing from an email's footer link", async ({browser, baseURL, asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s5', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        const managerName = 'Mona Manager';
        const firstName = `Footer check ${tag}`;
        const secondName = `Second check ${tag}`;
        const firstMessage = `Please read the footer. ${tag}`;
        const secondMessage = `Still reading? ${tag}`;
        const press = await seedPress(ompApi, tag, [
            {username: manager, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
            {username: author, givenName: 'Alba', familyName: 'Authorson', roles: ['author']},
        ]);
        const {submissionId} = await ompApi.createSubmission({
            tag,
            context: press.path,
            submitter: author,
            title: `Title ${tag}`,
        });

        // The Manager opens a discussion with the Author on the Submission
        // stage's discussions panel (the Manager's own box arrives ticked;
        // the form offers no email choice).
        const managerPage = await (await asUser(manager)).newPage();
        managerPage.on('dialog', (dialog) => dialog.accept()); // the leave-page prompt after a save
        const workflow = new WorkflowPage(managerPage, press.path);
        await workflow.gotoEditorial(submissionId);
        await addDiscussion(managerPage, {name: firstName, participantUsername: author, ownUsername: manager, message: firstMessage});

        // The Author's email: subject the name, the Manager's name in its
        // From line, ending with the discussion footer whose "unsubscribe"
        // and press name are links; the plain-text version shows each
        // link's address in parentheses after its words; the Manager holds
        // a copy (Rule 7a).
        const authorMail = await discussionEmail(pkpMail, {to: emailOf(author), name: firstName});
        expect(authorMail.summary.From.Name).toBe(managerName);
        expect(authorMail.full.Text).toMatch(
            new RegExp(`Reply to this comment at #${submissionId} Authorson.*or unsubscribe.*from emails sent by ${escapeRegExp(press.name)}`, 's')
        );
        expect(authorMail.full.Text).toMatch(/unsubscribe \(\s*https?:\/\/[^)]*\/notification\/unsubscribe\?[^)]*\)/);
        expect(authorMail.full.Text).toMatch(
            new RegExp(`${escapeRegExp(press.name)} \\(\\s*https?://[^)]*/${press.path}[^)]*\\)`)
        );
        expect(authorMail.link, 'the footer "unsubscribe" link').toBeTruthy();
        expect(authorMail.link).toMatch(new RegExp(`/${press.path}/notification/unsubscribe\\?validate=[^&]+&id=\\d+$`));
        const pressLink = pkpMail.extractLink(authorMail.full.HTML, press.name);
        expect(pressLink, 'the press name is a link').toBeTruthy();
        expect(pressLink).toMatch(new RegExp(`/${press.path}(/|$)`));
        await discussionEmail(pkpMail, {to: emailOf(manager), name: firstName});
        expect(await pkpMail.count({to: emailOf(author)})).toBe(1);

        // Signed out, the link opens the Unsubscribe page naming the Author's
        // address, the press's nine boxes in the page's order, every one
        // ticked; "Unsubscribe" answers the success page; the link works
        // again afterwards (Rules 8a–8d); no email confirms it.
        const visitor = await anonContext(browser, baseURL);
        try {
            const visitorPage = await visitor.newPage();
            const unsubscribe = new UnsubscribePage(visitorPage);
            await unsubscribe.goto(authorMail.link);
            await expect(unsubscribe.sentence()).toHaveText(
                `Select the emails that you no longer wish to receive at ${emailOf(author)} from ${press.name}.`
            );
            expect(await unsubscribe.boxLabels()).toEqual(OMP_UNSUBSCRIBE_BOXES);
            const boxCount = await unsubscribe.boxes().count();
            expect(boxCount).toBe(OMP_UNSUBSCRIBE_BOXES.length);
            for (let i = 0; i < boxCount; i++) {
                await expect(unsubscribe.boxes().nth(i)).toBeChecked();
            }
            await expect(unsubscribe.profileLink()).toBeVisible();
            await expect(unsubscribe.button()).toBeVisible();
            await unsubscribe.unsubscribe();
            await expect(unsubscribe.successHeading).toBeVisible();
            await expect(unsubscribe.resultSentence()).toContainText(
                `The email address ${emailOf(author)} has been successfully unsubscribed.`
            );
            await unsubscribe.goto(authorMail.link);
            for (let i = 0; i < boxCount; i++) {
                await expect(unsubscribe.boxes().nth(i)).toBeChecked();
            }
            // No email confirms it: the Author's mailbox still holds the
            // discussion's email alone (the press answered the unsubscribe
            // request; its mail leaves inside the request).
            expect(await pkpMail.count({to: emailOf(author)})).toBe(1);

            // Three broken links: each opens the bare "404 Not Found" page,
            // that text alone, without the press's header (Rule 8a).
            const broken = UnsubscribePage.brokenLinks(authorMail.link);
            await unsubscribe.expectNotFound(broken.codeOnly);
            await unsubscribe.expectNotFound(broken.idOnly);
            await unsubscribe.expectNotFound(broken.unknownId);

            // "user profile", signed out: the intact link once more, then the
            // link: the Login page; signed in as the Author, the press's
            // Profile page opens on "Identity" (Rule 8e).
            await unsubscribe.goto(authorMail.link);
            await unsubscribe.pressProfileLink();
            const login = new LoginPage(visitorPage);
            await login.expectForm();
            await expect(visitorPage).toHaveURL(/\/login/);
            await login.signIn(author, getPassword(author));
            const authorProfile = new ProfilePage(visitorPage, press.path);
            await authorProfile.expectOpen('identity');
            await authorProfile.expectSelectedTab('identity');
            await expect(visitorPage).toHaveURL(new RegExp(`/${press.path}/user/profile`));

            // The Author's tab: every email box ticked, every "Enable…"
            // ticked (Rule 8c); the tab has no row the Unsubscribe page did
            // not list a box for.
            await authorProfile.open('notifications');
            await authorProfile.expectSelectedTab('notifications');
            await expectTabState(authorProfile, {emailTicked: true});
            const tabRows = await authorProfile.notificationSentences();
            expect(tabRows.length).toBeGreaterThan(0);
            expect(tabRows.filter((row) => !OMP_UNSUBSCRIBE_BOXES.includes(row))).toEqual([]);
            expect([...tabRows].sort()).toEqual([...OMP_UNSUBSCRIBE_BOXES].sort());

            // A second discussion: the Manager's copy arrives, the Author's
            // mailbox holds none with that name (the first one is still
            // there), and the Author's Tasks window holds the new row: the
            // email stopped, the task kept (Rule 8c).
            await workflow.gotoEditorial(submissionId);
            await addDiscussion(managerPage, {name: secondName, participantUsername: author, ownUsername: manager, message: secondMessage});
            await pkpMail.expectNone({
                to: emailOf(author),
                subject: secondName,
                afterControl: {to: emailOf(manager), subject: secondName},
            });
            expect(await pkpMail.count({to: emailOf(author), subject: firstName})).toBe(1);
            const authorTasks = new TasksPanel(visitorPage);
            await gotoMySubmissions(visitorPage, press.path);
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

    test('S6: the link acts on the addressee, not on whoever is signed in', async ({browser, baseURL, asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s6', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        const name = `Discussion ${tag}`;
        const press = await seedPress(ompApi, tag, [
            {username: manager, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
            {username: author, givenName: 'Alba', familyName: 'Authorson', roles: ['author']},
        ]);
        const {submissionId} = await ompApi.createSubmission({
            tag,
            context: press.path,
            submitter: author,
            title: `Title ${tag}`,
        });

        // The Manager's session is the test's own (it is signed out and in
        // again below), through the press's Login form.
        const managerContext = await anonContext(browser, baseURL);
        try {
            const managerPage = await managerContext.newPage();
            managerPage.on('dialog', (dialog) => dialog.accept());
            await signInAtPress(managerPage, press.path, manager);

            // Scenario 5's link: a discussion with the Author.
            const workflow = new WorkflowPage(managerPage, press.path);
            await workflow.gotoEditorial(submissionId);
            await addDiscussion(managerPage, {name, participantUsername: author, ownUsername: manager, message: `Message ${tag}`});
            const {link} = await discussionEmail(pkpMail, {to: emailOf(author), name});
            expect(link, 'the footer "unsubscribe" link').toBeTruthy();

            // Signed in as the Manager, the page names the Author's address.
            const unsubscribe = new UnsubscribePage(managerPage);
            await unsubscribe.goto(link);
            await expect(unsubscribe.sentence()).toContainText(emailOf(author));
            await expect(unsubscribe.sentence()).not.toContainText(emailOf(manager));

            // The stale page: sign out in another tab of the same browser,
            // then "Unsubscribe" on the old page: "We could not unsubscribe
            // you" with its sentence naming the Author's address (Rule 8d).
            const otherTab = await managerContext.newPage();
            await otherTab.goto(`/index.php/${press.path}/login/signOut`);
            await otherTab.waitForURL((url) => !url.pathname.endsWith('/signOut'), {waitUntil: 'commit', timeout: 30_000});
            await expect(new LoginPage(otherTab).form.or(otherTab.locator('#navigationUserWrapper')).first()).toBeVisible({timeout: 30_000});
            await otherTab.close();
            await unsubscribe.unsubscribe();
            await expect(unsubscribe.errorHeading).toBeVisible();
            await expect(unsubscribe.successHeading).toHaveCount(0);
            await expect(unsubscribe.resultSentence()).toHaveText(UNSUBSCRIBE_ERROR(emailOf(author)));

            // The link afresh: signed in as the Manager again, the page shows
            // again with the Author's address; every box but "Discussion
            // added." unticked, then "Unsubscribe": the success page.
            await signInAtPress(managerPage, press.path, manager);
            await unsubscribe.goto(link);
            await expect(unsubscribe.sentence()).toContainText(emailOf(author));
            const boxCount = await unsubscribe.boxes().count();
            expect(boxCount).toBe(OMP_UNSUBSCRIBE_BOXES.length);
            for (let i = 0; i < boxCount; i++) {
                await unsubscribe.boxes().nth(i).uncheck();
            }
            await unsubscribe.box(`email${DISCUSSION_SETTING.charAt(0).toUpperCase()}${DISCUSSION_SETTING.slice(1)}`).check();
            await unsubscribe.unsubscribe();
            await expect(unsubscribe.successHeading).toBeVisible();

            // "user profile", signed in: the press's Profile page opens on
            // "Identity" (Rule 8e).
            await unsubscribe.pressProfileLink();
            const managerProfile = new ProfilePage(managerPage, press.path);
            await managerProfile.expectOpen('identity');
            await managerProfile.expectSelectedTab('identity');
            await expect(managerPage).toHaveURL(new RegExp(`/${press.path}/user/profile`));

            // The Author's tab: the email box ticked on "Discussion added."
            // only, every "Enable…" ticked; the Manager's own tab is unchanged.
            const authorPage = await (await asUser(author)).newPage();
            const authorProfile = await openNotificationsTab(authorPage, press.path);
            const allow = authorProfile.allowBoxes();
            const rows = await allow.count();
            expect(rows).toBeGreaterThan(1);
            for (let i = 0; i < rows; i++) {
                await expect(allow.nth(i)).toBeChecked();
            }
            await expect(checkedEmailBoxes(authorProfile)).toHaveCount(1);
            await expect(authorProfile.notificationPair(DISCUSSION_SETTING).email).toBeChecked();
            await managerProfile.goto('notifications');
            await expectTabState(managerProfile, {emailTicked: false});
        } finally {
            await managerContext.close();
        }
    });

    test('S7: the rows, per application, and the site-level tab', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        test.setTimeout(180_000);
        // A scratch press, so the site holds more than one press (Rule 5d),
        // with a submission whose task reaches `admin` as its auto-enrolled
        // Press Manager (the Site Administrator has an unread task).
        const tag = makeTag('s7', testInfo);
        const title = `Title ${tag}`;
        const press = await seedPress(ompApi, tag, [
            {username: `${tag}mg`, roles: ['manager']},
            {username: `${tag}au`, roles: ['author']},
        ]);

        // The Press Manager on the seeded press: the four groups with
        // exactly the press's rows (no issue row: a press has no issues),
        // every "Enable…" ticked, every email box unticked (Fields).
        const managerPage = await (await asUser('manager.maya')).newPage();
        const profile = await openNotificationsTab(managerPage, PRESS);
        await expect(profile.notificationsIntro()).toHaveText(NOTIFICATIONS_INTRO);
        expect(await profile.notificationTable()).toEqual(OMP_TAB);
        await expectTabState(profile, {emailTicked: false});

        // The site's home page as a Manager: the name is bare, with no
        // number; on the press's home page the same name carries one
        // (Rule 4).
        let header = await gotoSiteHome(managerPage);
        await header.expectBareName('manager.maya');
        expect((await hiddenMenuEntries(header)).find((entry) => /^Dashboard/.test(entry))).toBe('Dashboard');
        await expect(header.dashboardCount()).toHaveCount(0);
        header = await gotoPressHome(managerPage, PRESS);
        await expect(header.toggle).toHaveText(/^\s*manager\.maya\s+\d+\s*$/);
        await expect(header.nameCount()).toHaveText(/^\s*\d+\s*$/);

        // The Site Administrator's site-level tab: the same groups without
        // "Statistics report summary." (Rule 5d).
        const adminPage = await (await asUser('admin')).newPage();
        const siteProfile = new ProfilePage(adminPage, null);
        await siteProfile.goto('notifications');
        await expect(adminPage).toHaveURL(/\/index\/(en\/)?user\/profile/);
        expect(await siteProfile.notificationTable()).toEqual(SITE_TAB);

        // The scratch press's submission, seeded right before the reads
        // below: the window lists only `admin`'s 25 newest tasks, and
        // parallel tests raise several a second, so a task raised at the
        // start of the test can be off that page by now (fix list B).
        await ompApi.createSubmission({tag, context: press.path, submitter: `${tag}au`, title});

        // The site-level bell: the same "Tasks" window, with the same rows
        // as from a press's editorial page (Rule 2d); the scratch press's
        // row is in both. The window shows the first 25 of `admin`'s
        // thousands of tasks, newest first to the second: parallel tests
        // raise `admin` tasks between the two reads, and rows tied at the
        // 25th place come back either way, so each read keeps this test's
        // own rows, sorted (fix list B, flake-s26).
        const adminTasks = new TasksPanel(adminPage);
        const ownRows = (rows) => unordered(rows.filter((row) => row.endsWith(` | ${title}`)));
        const readEditorialRows = async () => {
            await gotoEditorial(adminPage, press.path);
            await adminTasks.open();
            await expect(adminTasks.row(title)).toHaveCount(1);
            const rows = await adminTasks.rowTexts();
            await adminTasks.close();
            return ownRows(rows);
        };
        const readSiteRows = async () => {
            await siteProfile.goto('notifications');
            await expect(adminTasks.bell()).toBeVisible();
            await adminTasks.open();
            await expect(adminTasks.row(title)).toHaveCount(1);
            const rows = await adminTasks.rowTexts();
            await adminTasks.close();
            return ownRows(rows);
        };
        const rows = await expectAgreeing(readEditorialRows, readSiteRows, {label: 'the site-level window lists the same rows'});
        expect(rows.length).toBeGreaterThan(0);

        // Control: on the site's own home page the Site Administrator's name
        // is bare too, but the "Dashboard" entry under it reads "Dashboard"
        // followed by the number the bell shows (Rule 4).
        const readSiteBell = async () => {
            await siteProfile.goto('notifications');
            await expect(adminTasks.bell()).toBeVisible();
            return adminTasks.count();
        };
        const readDashboardEntry = async () => {
            const siteHeader = await gotoSiteHome(adminPage);
            await siteHeader.expectBareName('admin');
            const entry = (await hiddenMenuEntries(siteHeader)).find((text) => /^Dashboard/.test(text));
            const match = /^Dashboard (\d+)$/.exec(entry || '');
            expect(match, `the entry reads "${entry}"`).not.toBeNull();
            return Number(match[1]);
        };
        const count = await expectBetweenReads(readSiteBell, readDashboardEntry, {label: 'the "Dashboard" entry carries the bell\'s number'});
        expect(count).toBeGreaterThan(0);
    });

    test('S8: registration presets the email choice', async ({browser, baseURL, ompApi}, testInfo) => {
        test.slow();
        test.setTimeout(180_000);
        const tag = makeTag('s8', testInfo);
        const press = await seedPress(ompApi, tag, [{username: `${tag}mg`, roles: ['manager']}]);

        /** Register a visitor on the scratch press; they land signed in. */
        const registerVisitor = async (username, {notify}) => {
            const context = await anonContext(browser, baseURL);
            const page = await context.newPage();
            await page.goto(RegisterPage.contextUrl(press.path));
            const register = new RegisterPage(page);
            await expect(register.heading).toBeVisible({timeout: 30_000});
            await register.fillIdentity({
                givenName: 'Vera',
                familyName: 'Visitor',
                email: emailOf(username),
                username,
                password: getPassword(username),
            });
            await register.privacyConsent.check();
            await expect(register.emailConsent).not.toBeChecked();
            if (notify) {
                await register.emailConsent.check();
            }
            await register.submit();
            await expect(new RegistrationCompletePage(page).heading).toBeVisible({timeout: 30_000});
            return {context, page};
        };

        // The first visitor leaves "Yes, I would like to be notified…"
        // unticked: the Public Announcements row has both boxes ticked; the
        // other rows are at their defaults (Rule 5e).
        const firstUser = `${tag}r1`;
        const first = await registerVisitor(firstUser, {notify: false});
        try {
            const profile = await openNotificationsTab(first.page, press.path);
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

            // The reader-side header: on the press's home page the new
            // account's name shows without a number: a Reader sees the bare
            // name (Rule 4; S1's Manager is the control on the same page).
            const header = await gotoPressHome(first.page, press.path);
            await header.expectBareName(firstUser);
        } finally {
            await first.context.close();
        }

        // The second visitor ticks the box: every box at its default.
        const second = await registerVisitor(`${tag}r2`, {notify: true});
        try {
            const profile = await openNotificationsTab(second.page, press.path);
            await expectTabState(profile, {emailTicked: false});
        } finally {
            await second.context.close();
        }
    });

    test('S10: a published version raises a task for the Author', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s10', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        const title = `Title ${tag}`;
        const press = await seedPress(ompApi, tag, [
            {username: manager, roles: ['manager']},
            {username: author, roles: ['author']},
        ]);
        // A submission of the Author's whose version has just been published
        // (the seed publishes it the way the workflow does; note s10).
        await ompApi.createSubmission({tag, context: press.path, submitter: author, title, submitted: true, published: true});

        // The bell: the Author opens an editorial page after the publish: a
        // red "1" (Rule 2a).
        const authorPage = await (await asUser(author)).newPage();
        const authorTasks = new TasksPanel(authorPage);
        await gotoMySubmissions(authorPage, press.path);
        await authorTasks.expectCount(1);

        // The Tasks window: one row, bold, opening "A new version of your
        // submission" (Rules 2b, 6). The screen carries the title INSIDE the
        // sentence, 'A new version of your submission, "{title}", was
        // published.', and shows no title line under it, where the spec's
        // bullet says "with the submission's title under it": recorded as
        // T-omp-1 (.reports/U05/test-omp-findings.md); the read below is
        // today's screen, not the spec's claim.
        await authorTasks.open();
        await expect(authorTasks.rows()).toHaveCount(1);
        const row = authorTasks.rows().first();
        await authorTasks.expectUnread(row);
        await expect(authorTasks.sentence(row)).toHaveText(
            `${NEW_VERSION_OPENING}, "${title}", was published.`
        );
        await expect(authorTasks.title(row)).toHaveCount(0);
        await expect(row).toContainText(title);

        // Control: the Press Manager's window holds no row opening "A new
        // version of your submission" for this title, while it holds the
        // "needs an editor" row the same submission raised (Rule 6).
        const managerPage = await (await asUser(manager)).newPage();
        const managerTasks = new TasksPanel(managerPage);
        await gotoEditorial(managerPage, press.path);
        await managerTasks.open();
        await expect(managerTasks.row(title)).toHaveCount(1);
        await expect(managerTasks.sentence(managerTasks.row(title))).toHaveText(NEEDS_EDITOR_TASK);
        await expect(managerTasks.rowsOpening(new RegExp(`^\\s*${escapeRegExp(NEW_VERSION_OPENING)}`))).toHaveCount(0);
    });

    test('S11: the review-complete email goes to the assigned editors alone', async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(180_000);
        const tag = makeTag('s11', testInfo);
        const manager = `${tag}mg`;
        const sectionEditor = `${tag}se`;
        const author = `${tag}au`;
        const reviewer = `${tag}rv`;
        const reviewerName = 'Rita Reviewer';
        const title = `Title ${tag}`;
        const press = await seedPress(ompApi, tag, [
            {username: manager, roles: ['manager']},
            {username: sectionEditor, givenName: 'Sara', familyName: 'Series', roles: ['sectionEditor']},
            {username: author, givenName: 'Alba', familyName: 'Authorson', roles: ['author']},
            {username: reviewer, givenName: 'Rita', familyName: 'Reviewer', roles: ['externalReviewer']},
        ]);
        // In external review with the Series Editor assigned and the
        // Reviewer's request accepted; the Press Manager is not assigned
        // (note s11).
        const {submissionId} = await ompApi.createSubmission({
            tag,
            context: press.path,
            submitter: author,
            title,
            decisions: ['skipInternalReview'],
            reviewRounds: [{stage: 'external', reviewers: [{username: reviewer, status: 'accepted'}]}],
            participants: [{username: sectionEditor, role: 'sectionEditor'}],
        });

        // The Reviewer opens the review from the reviewer dashboard and
        // walks its steps to "Submit Review": the press's form offers no
        // "Recommendation"; "OK" answers the confirmation.
        const reviewerPage = await (await asUser(reviewer)).newPage();
        const list = new ReviewerAssignmentsPage(reviewerPage, press.path);
        const wizard = new ReviewWizardPage(reviewerPage, press.path, {privateBoxLabel: 'For editor only'});
        await list.goto('actionRequired');
        await list.openWizard(list.row(tag), 'Finish review');
        await wizard.expectOpen(title);
        await wizard.expectStep(1);
        await wizard.saveAndContinueButton.click();
        await wizard.expectStep(2);
        await wizard.continueToStep3();
        await expect(wizard.submitReviewButton).toBeVisible();
        await expect(wizard.recommendationSelect).toHaveCount(0);
        await wizard.typeComments(`Review text ${tag}`);
        await wizard.submitReview();
        await wizard.expectCompleted();

        // The Series Editor's mailbox: the review-complete email, subject
        // "Review complete: {reviewer} recommends {recommendation} for
        // #{submission number} {authors} — "{title}"" (the word after
        // "recommends" is read loosely: U28 OMP2), ending "This is an
        // automated message from {press name}. You can unsubscribe from
        // this email at any time." with "unsubscribe" as the link (Rules 6,
        // 7a).
        const summary = await pkpMail.find({to: emailOf(sectionEditor), subject: REVIEW_COMPLETE_SUBJECT, contains: title});
        expect(summary.Subject).toMatch(
            new RegExp(`^Review complete: ${reviewerName} recommends \\S+ for #${submissionId} Authorson — "${escapeRegExp(title)}"$`)
        );
        const full = await pkpMail.fullMessage(summary.ID);
        expect(full.Text).toMatch(
            new RegExp(
                `—\\s*This is an automated message from ${escapeRegExp(press.name)} \\(\\s*https?://[^)]*\\)\\. You can unsubscribe \\(\\s*https?://[^)]*/notification/unsubscribe\\?[^)]*\\) from this email at any time\\.`
            )
        );
        const link = pkpMail.extractLink(full.HTML, /^unsubscribe$/i);
        expect(link, 'the footer "unsubscribe" link').toBeTruthy();
        expect(link).toMatch(new RegExp(`/${press.path}/notification/unsubscribe\\?validate=[^&]+&id=\\d+$`));

        // No task: the Series Editor's Tasks window has no row for the
        // submission at all (bounded by the email above; the window's own list is the read).
        const editorPage = await (await asUser(sectionEditor)).newPage();
        const editorTasks = new TasksPanel(editorPage);
        await gotoEditorial(editorPage, press.path);
        await editorTasks.open();
        await expect(editorTasks.grid()).toBeVisible();
        await expect(editorTasks.rows().or(editorTasks.noItems()).first()).toBeVisible();
        await expect(editorTasks.row(title)).toHaveCount(0);
        await expect(editorTasks.rowsOpening(/reviewer has commented/i)).toHaveCount(0);
        await expect(editorTasks.rowsOpening(/review complete/i)).toHaveCount(0);
        await expect(editorTasks.rows().filter({hasText: reviewerName})).toHaveCount(0);

        // Control: once the Series Editor's email has arrived, the Press
        // Manager's mailbox holds no email with that subject (Rule 6).
        await pkpMail.expectNone({
            to: emailOf(manager),
            subject: REVIEW_COMPLETE_SUBJECT,
            contains: title,
            afterControl: {to: emailOf(sectionEditor), subject: REVIEW_COMPLETE_SUBJECT, contains: title},
        });
    });
});
