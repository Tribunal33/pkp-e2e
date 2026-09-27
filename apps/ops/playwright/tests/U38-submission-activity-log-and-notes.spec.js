// @ts-check
/**
 * @file playwright/tests/U38-submission-activity-log-and-notes.spec.js
 *
 * Submission activity log & notes — OPS suite, one test per canonical
 * scenario the spec runs on a preprint server: the common scenarios 1 and
 * 2, in the server's own words: the submit line "Preprint submitted", the
 * Moderator as the assigned sub-editor, the decline recorded from
 * Production, the server's one stage. Scenarios 3 and 4 are {OJS OMP} and
 * name their OPS absence in the spec (no "Submission Files" list, no
 * reviews), so the suite carries no absence test for them.
 * Spec: docs/specs/U38-submission-activity-log-and-notes.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A3 🐞: S1 closes the window with text typed only while the preprint
 *   has no note.
 * - A9 🐞: every page accepts the browser's leave-page question; no test
 *   asserts whether one appears.
 * - A1 🐞, A2 🐞, A5 🐞, A7 🐞, A4 ❓, A8 ❓: no scenario reaches them
 *   here.
 * - OMP1: another app's territory.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only (A1, A7). Every test seeds its own preprint with a unique
 * tag (M5); a submitted seed sits at Production; every note, the decline
 * and the "Login As" are driven on screen (footnote s0). S2 runs on the
 * seeded server as the Preprint Server manager `manager.maya`. S1 runs on
 * a scratch server with throwaway accounts (a manager, a Moderator
 * assigned through `participants[]`, an Author): it reads "Note posted."
 * and "Note deleted.", which the app queues per user and the next page
 * fetch of ANY session of that user takes (patterns.md parallel lesson 2),
 * so a roster persona used by other workers could lose them. The Site
 * Administrator of S1 is `admin`, a manager of every scratch server (s0).
 * Lines written in the same second have no fixed order (Rule 2), so a line
 * or a note is found by its text, never by its position; the one
 * positional read is a "top line" a scenario names, a note posted seconds
 * after everything else. Every absence is read settled (the tab's own
 * fetch answered, an exact list compared) and paired with a positive
 * control taken the same way (M4, M6). The window's close question is a
 * browser dialog, and a page that dropped a note can raise the leave-page
 * question: every page records its browser dialogs from the start and
 * accepts any the test did not script. Waits are web-first (A5).
 * Everything runs in the parallel `ops` project.
 */
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {ParticipantsPanel} = require('../../../../shared/playwright/pages/StageParticipantsPages.js');
const {recordBrowserDialogs} = require('../../../../shared/playwright/pages/SubmissionFilesPages.js');
const {
    ActivityLogWindow,
    ACTIVITY_LOG_TABS,
    HISTORY_COLUMNS,
    NOTES_TEXT,
} = require('../../../../shared/playwright/pages/ActivityLogPages.js');
const {DecisionPage} = require('../pages/DecisionPage.js');
const {ComposerPage} = require('../pages/DecisionWizardPages.js');
const {LoginAsDialog, UserMenu} = require('../pages/LoginSessionsPages.js');
const {unordered} = require('../../../../shared/playwright/support/order.js');

const SERVER = 'publicknowledge';
const MANAGER = 'manager.maya';
const MANAGER_NAME = 'Maya Manager';
const AUTHOR = 'author.alex';
const AUTHOR_NAME = 'Alex Author';
const ADMIN = 'admin';
/** The installer's account as the log prints it (U38 claim check K3, every app). */
const ADMIN_NAME = 'admin admin';

/** The preprint server's submit line (Rule 3). */
const SUBMIT_LINE = 'Preprint submitted';

/** "Date": a day alone, year-month-day (Settings bullet 1); a note's date and time (Settings bullet 2). */
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME = /^\s*\d{4}-\d{2}-\d{2} \d{1,2}:\d{2} [AP]M\s*$/;

/** An account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A text with its whitespace folded. */
const flat = (text) => (text || '').replace(/\s+/g, ' ').trim();

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u38${scenario}opsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** Seed a submitted preprint, so at Production (on the seeded server unless `context` is given). */
async function seed(opsApi, tag, {context = SERVER, submitter = AUTHOR, ...extra} = {}) {
    return await opsApi.createSubmission({tag, context, submitter, title: `Submission ${tag}`, ...extra});
}

/**
 * A scratch preprint server with throwaway accounts, `{key: [givenName,
 * familyName, roles]}`; returns them by key with `username` and `name`.
 */
async function seedServer(opsApi, tag, accounts) {
    const people = {};
    const users = [];
    for (const [key, [givenName, familyName, roles]] of Object.entries(accounts)) {
        const username = `${tag}${key}`;
        people[key] = {username, name: `${givenName} ${familyName}`};
        users.push({username, givenName, familyName, email: mailOf(username), roles});
    }
    await opsApi.createContext({tag, context: {name: `Server ${tag}`}, users});
    return people;
}

/**
 * A page as `username` on the preprint's workflow, with the Activity Log
 * reader and a recorder of the page's browser dialogs (any the test did
 * not script is accepted, the leave-page question included).
 */
async function openWorkflow(asUser, appContext, username, submissionId, {contextPath = SERVER} = {}) {
    const page = await (await asUser(username)).newPage();
    const asked = recordBrowserDialogs(page);
    const frame = new WorkflowPage(page, contextPath, {appContext});
    await frame.gotoEditorial(submissionId);
    return {page, frame, log: new ActivityLogWindow(page, frame), asked};
}

/**
 * Land the same address again: a closed legacy window can leave a hidden
 * shell over the workflow that hides its tables from role reads until the
 * next navigation (patterns.md locator pitfall 4).
 */
async function reland(page, frame, submissionId) {
    await page.goto(page.url());
    await frame.expectOpen(submissionId);
}

/** A notice the app shows after a legacy save ("Note posted.", "Note deleted."). */
function notice(page, text) {
    return page.getByText(text).first();
}

/** The lines as `{user, event}` pairs (the Date cell and the arrow dropped). */
const userEvents = (lines) => lines.map(({user, event}) => ({user, event}));

test.describe('submission activity log & notes', () => {
    test('S1: a note posted, read on "History" and deleted', {tag: '@smoke'}, async ({asUser, opsApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        const people = await seedServer(opsApi, tag, {
            mg: ['Mira', 'Manager', ['manager']],
            se: ['Mona', 'Moderator', ['sectionEditor']],
            au: ['Ava', 'Author', ['author']],
        });
        const {submissionId} = await seed(opsApi, `${tag}s`, {
            context: tag,
            submitter: people.au.username,
            participants: [{username: people.se.username, role: 'sectionEditor'}],
        });
        const MG = people.mg.name;
        const SE = people.se.name;

        const mg = await openWorkflow(asUser, appContext, people.mg.username, submissionId, {contextPath: tag});
        const log = mg.log;
        const address = mg.page.url();

        // The window: "History" first of "History" and "Notes"; the columns;
        // the server's submit line; every "Date" a day alone, newest first;
        // Escape closes it and leaves the workflow as it was (Rules 1, 2, 3).
        await log.open();
        await expect(log.tabs()).toHaveText(ACTIVITY_LOG_TABS);
        await log.expectTab('History');
        await expect(log.historyHeaders()).toHaveText(HISTORY_COLUMNS);
        let lines = await log.historyLines();
        expect(lines.map((l) => l.event)).toContain(SUBMIT_LINE);
        for (const line of lines) {
            expect(line.date, `the date of "${line.event}"`).toMatch(DAY);
        }
        const days = lines.map((l) => l.date);
        expect(days, 'newest first').toEqual([...days].sort().reverse());
        // lint-ok: escape Rules 1-3 claim the key; the log is the top reka layer, which takes it whatever holds the focus
        await mg.page.keyboard.press('Escape');
        await log.expectClosed();
        await mg.frame.expectOpen(submissionId);
        await expect(log.button()).toBeVisible();
        expect(mg.page.url()).toBe(address);

        // "Notes" with no note: the empty sentence, the box and the button (Rule 10).
        await log.open();
        await log.selectTab('Notes');
        await expect(log.noNotes()).toBeVisible();
        await expect(log.notes()).toHaveCount(0);
        await expect(log.noteBox()).toBeVisible();
        await expect(log.addNoteButton()).toBeVisible();

        // Text not added, then "Close": the question; "Cancel" keeps the
        // window and the text; "OK" closes it; the box is empty on the way
        // back and no note was added (Rules 1, 10d).
        await log.noteBox().fill('Draft remark.');
        mg.asked.answerNext('dismiss');
        await log.closeButton().click();
        await expect.poll(() => mg.asked.messages.length).toBe(1);
        expect(mg.asked.messages[0]).toBe(NOTES_TEXT.formChanged);
        await expect(log.dialog()).toBeVisible();
        await expect(log.noteBox()).toHaveValue('Draft remark.');
        mg.asked.answerNext('accept');
        await log.closeButton().click();
        await log.expectClosed();
        expect(mg.asked.messages).toEqual([NOTES_TEXT.formChanged, NOTES_TEXT.formChanged]);
        await log.open();
        await log.selectTab('Notes');
        await expect(log.noteBox()).toHaveValue('');
        await expect(log.noNotes()).toBeVisible();
        await expect(log.notes()).toHaveCount(0);

        // Posting a note: "Note posted.", the note with the writer, the date
        // and time, the text and "Delete"; the box empty (Rules 10, 10a).
        const posted = await log.addNote('Checked the figures.');
        expect(posted.status()).toBe(200);
        await expect(notice(mg.page, NOTES_TEXT.posted)).toBeVisible();
        const first = log.note('Checked the figures.');
        await expect(first).toHaveCount(1);
        await expect(log.noteUser(first)).toHaveText(MG);
        await expect(log.noteDate(first)).toHaveText(DATE_TIME);
        await expect(log.noteText(first)).toHaveText('Checked the figures.', {useInnerText: true});
        await expect(log.noteDeleteButton(first)).toBeVisible();
        await expect(log.notes()).toHaveCount(1);
        await expect(log.noNotes()).toHaveCount(0);
        await expect(log.noteBox()).toHaveValue('');

        // The note on "History", without closing the window: the top line
        // under the writer's name; nothing asked on the way (Rules 1b, 10a).
        await log.selectTab('History');
        lines = await log.historyLines();
        expect(userEvents(lines)[0]).toEqual({user: MG, event: NOTES_TEXT.historyLine});
        expect(mg.asked.messages).toHaveLength(2);
        await log.close();

        // The Moderator's "Delete": the line and the note under the
        // manager's name; "Confirm" with its question, "OK" and "Cancel";
        // "Cancel" keeps the note; "OK": "Note deleted." and the empty
        // sentence (Actors row 5; Rule 10c).
        const se = await openWorkflow(asUser, appContext, people.se.username, submissionId, {contextPath: tag});
        await se.log.open();
        const seenBySe = await se.log.historyLines();
        expect(userEvents(seenBySe).filter((l) => l.event === NOTES_TEXT.historyLine)).toEqual([
            {user: MG, event: NOTES_TEXT.historyLine},
        ]);
        await se.log.selectTab('Notes');
        const seNote = se.log.note('Checked the figures.');
        await expect(se.log.noteUser(seNote)).toHaveText(MG);
        await expect(se.log.noteDeleteButton(seNote)).toBeVisible();
        let confirm = await se.log.pressDelete(seNote);
        await expect(confirm).toContainText(NOTES_TEXT.deleteQuestion);
        await expect(confirm.getByRole('button', {name: 'OK', exact: true})).toBeVisible();
        await expect(confirm.getByRole('button', {name: 'Cancel', exact: true})).toBeVisible();
        await se.log.cancelDelete();
        await expect(seNote).toHaveCount(1);
        await expect(se.log.noNotes()).toHaveCount(0);
        confirm = await se.log.pressDelete(seNote);
        const deleted = await se.log.confirmDelete();
        expect(deleted.status()).toBe(200);
        await expect(notice(se.page, NOTES_TEXT.deleted)).toBeVisible();
        await expect(se.log.noNotes()).toBeVisible();
        await expect(se.log.notes()).toHaveCount(0);

        // The line kept: "History" holds the same lines as when the
        // Moderator opened it, and none for the deletion (Rule 10c; Side effects).
        await se.log.selectTab('History');
        // Compared as a multiset: lines logged in the same second have no
        // fixed order among them (Rule 2; fix list B, flake-s26).
        expect(unordered(await se.log.historyLines())).toEqual(unordered(seenBySe));
        await se.log.close();

        // Under "Login As": the administrator, acting as the Moderator
        // through the Participants row's "Login As", posts a note: listed
        // under the Moderator's name; its line reads "{administrator}
        // (acting as {Moderator})" (Rules 4b, 10).
        const ad = await openWorkflow(asUser, appContext, ADMIN, submissionId, {contextPath: tag});
        const participants = new ParticipantsPanel(ad.page, tag, {appContext});
        await expect(participants.heading()).toBeVisible({timeout: 30_000});
        await participants.chooseAction(SE, 'Login As');
        const loginAs = new LoginAsDialog(ad.page);
        await loginAs.expectOpen();
        await loginAs.ok();
        // The page the sign-in lands on carries the acted-as username in the user menu.
        await expect(new UserMenu(ad.page).button).toContainText(people.se.username, {timeout: 30_000});
        await ad.frame.gotoEditorial(submissionId);
        await ad.log.open();
        await ad.log.selectTab('Notes');
        const acting = await ad.log.addNote('Posted while acting.');
        expect(acting.status()).toBe(200);
        const actingNote = ad.log.note('Posted while acting.');
        await expect(actingNote).toHaveCount(1);
        await expect(ad.log.noteUser(actingNote)).toHaveText(SE);
        await ad.log.selectTab('History');
        lines = await ad.log.historyLines();
        expect(userEvents(lines)[0]).toEqual({user: `${ADMIN_NAME} (acting as ${SE})`, event: NOTES_TEXT.historyLine});
        await ad.log.close();

        // The manager's "Delete" on the Moderator's note: "Note deleted.";
        // "History" still lists both "Posted new note." lines (Actors row 5;
        // Rule 10c). Control: the older one reads the manager's name alone
        // (Rules 4a, 4b).
        await reland(mg.page, mg.frame, submissionId);
        await log.open();
        await log.selectTab('Notes');
        const theirs = log.note('Posted while acting.');
        await expect(log.noteUser(theirs)).toHaveText(SE);
        await expect(log.noteDeleteButton(theirs)).toBeVisible();
        await log.pressDelete(theirs);
        await log.confirmDelete();
        await expect(notice(mg.page, NOTES_TEXT.deleted)).toBeVisible();
        await expect(theirs).toHaveCount(0);
        await log.selectTab('History');
        lines = await log.historyLines();
        expect(userEvents(lines).filter((l) => l.event === NOTES_TEXT.historyLine)).toEqual([
            {user: `${ADMIN_NAME} (acting as ${SE})`, event: NOTES_TEXT.historyLine},
            {user: MG, event: NOTES_TEXT.historyLine},
        ]);
        await log.close();
    });

    test('S2: an email line and "View Email"', async ({asUser, opsApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const {submissionId} = await seed(opsApi, tag);
        const {page, frame, log} = await openWorkflow(asUser, appContext, MANAGER, submissionId);
        const decision = new DecisionPage(page);
        const composer = new ComposerPage(page);

        // The decision: "Decline Submission" on Production, recorded with
        // its email as the email page offers it, its "Subject:" and letter
        // noted (U34).
        await frame.actionButton('Decline Submission').click();
        await decision.expectOpen('Decline Submission');
        await decision.awaitComposerLoaded();
        await expect(composer.subjectInput()).not.toHaveValue('', {timeout: 30_000});
        const subject = await composer.subjectInput().inputValue();
        await expect.poll(() => composer.firstParagraphText(), {timeout: 30_000}).not.toBe('');
        const letter = flat(await composer.letterText());
        await decision.recordDecision('Submission Declined');
        await decision.viewSubmission();
        await frame.expectOpen(submissionId);

        // The lines, the sender named (Rules 3, 4a, 4c, 7).
        const declineLine = `${MANAGER_NAME} declined this submission.`;
        const emailLine = `An email has been sent: ${subject}`;
        await log.open();
        expect(userEvents(await log.linesWith(declineLine))).toEqual([{user: MANAGER_NAME, event: declineLine}]);
        expect(userEvents(await log.linesWith(emailLine))).toEqual([{user: MANAGER_NAME, event: emailLine}]);

        // The arrow: on the email line, its strip holding "View Email"; none
        // on the decision line (Rule 5).
        expect((await log.linesWith(emailLine))[0].arrow).toBe(true);
        expect((await log.linesWith(declineLine))[0].arrow).toBe(false);
        await expect(log.arrow(log.historyRow(declineLine))).toHaveCount(0);
        const before = await log.historyLines();
        const strip = await log.openStrip(emailLine);
        expect(await log.stripActions(strip)).toEqual(['View Email']);

        // "View Email": From, To, Subject, then the letter (Rule 7).
        const view = await log.viewEmail(strip);
        const viewLines = await view.lines();
        expect(viewLines).toContain(`From: "${MANAGER_NAME}" <${mailOf(MANAGER)}>`);
        expect(viewLines).toContain(`To: "${AUTHOR_NAME}" <${mailOf(AUTHOR)}>`);
        expect(viewLines).toContain(`Subject: ${subject}`);
        const viewText = await view.text();
        expect(viewText).toContain(letter);
        expect(viewText.indexOf(letter), 'the letter under the lines').toBeGreaterThan(viewText.indexOf(`Subject: ${subject}`));

        // Control: "Notes", then "History": the same lines, none added for
        // opening the window or "View Email" (Side effects).
        await view.close();
        await log.selectTab('Notes');
        await log.selectTab('History');
        expect(unordered(await log.historyLines())).toEqual(unordered(before));
        await log.close();
    });
});
