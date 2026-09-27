// @ts-check
/**
 * @file playwright/tests/U38-submission-activity-log-and-notes.spec.js
 *
 * Submission activity log & notes — OJS suite, one test per canonical
 * scenario the spec runs on OJS (the common scenarios 1 and 2 and the
 * journal-and-press scenarios 3 and 4).
 * Spec: docs/specs/U38-submission-activity-log-and-notes.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A3 🐞: S1 closes the window with text typed only while the submission
 *   has no note.
 * - A9 🐞: every page accepts the browser's leave-page question; no test
 *   asserts whether one appears.
 * - A8 ❓: S4's "Open" half counts the two assignment lines and never reads
 *   whose name they carry.
 * - A1 🐞, A2 🐞, A5 🐞, A7 🐞, A4 ❓: no scenario reaches them here.
 * - OMP1: another app's territory.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only (A1, A7). Every test seeds its own submission with a unique
 * tag (M5); every note, the decline, the revision, the deletion and the
 * "Login As" are driven on screen (footnote s0). S2 and S3 run on the
 * seeded journal as the Journal Manager `manager.maya`. S1 runs on a
 * scratch journal with throwaway accounts (a manager, a Section Editor
 * assigned through `participants[]`, an Author): it reads "Note posted."
 * and "Note deleted.", which the app queues per user and the next page
 * fetch of ANY session of that user takes (patterns.md parallel lesson 2),
 * so a roster persona used by other workers could lose them; the U36 suite
 * does the same for the same notices. The Site Administrator of S1 and the
 * Journal Manager of S4's control is `admin`, a manager of every scratch
 * journal (s0). S4 builds its two journals as footnote s0 says. Lines
 * written in the same second have no fixed order (Rule 2), so a line or a
 * note is found by its text, never by its position; the one positional
 * read is a "top line" a scenario names, a note posted seconds after
 * everything else. Every absence is read settled (the tab's own fetch
 * answered, an exact list compared) and paired with a positive control
 * taken the same way (M4, M6). The window's close question is a browser
 * dialog, and a page that dropped a note can raise the leave-page question:
 * every page records its browser dialogs from the start and accepts any
 * the test did not script. Downloads are read through Playwright's
 * download event (the suggested name). Waits are web-first (A5).
 * Everything runs in the parallel `ojs` project.
 */
const path = require('path');
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {ParticipantsPanel} = require('../../../../shared/playwright/pages/StageParticipantsPages.js');
const {
    MENU_KEYS,
    WIZARD_STEPS,
    FileList,
    UploadWizard,
    InformationCenter,
    DeleteFileDialog,
    recordBrowserDialogs,
} = require('../../../../shared/playwright/pages/SubmissionFilesPages.js');
const {
    ActivityLogWindow,
    ACTIVITY_LOG_TABS,
    HISTORY_COLUMNS,
    NOTES_TEXT,
} = require('../../../../shared/playwright/pages/ActivityLogPages.js');
const {DecisionWizardPage, ComposerPage} = require('../pages/DecisionWizardPages.js');
const {LoginAsDialog, UserMenu} = require('../pages/LoginSessionsPages.js');
const {unordered} = require('../../../../shared/playwright/support/order.js');

const JOURNAL = 'publicknowledge';
const MANAGER = 'manager.maya';
const MANAGER_NAME = 'Maya Manager';
const AUTHOR = 'author.alex';
const AUTHOR_NAME = 'Alex Author';
const ADMIN = 'admin';
/** The installer's account as the log prints it (U38 claim check K3, every app). */
const ADMIN_NAME = 'admin admin';

/** The journal's submit line (Rule 3; OJS's own wording, seed-facts). */
const SUBMIT_LINE = 'Article submitted';
const SUBMISSION_FILES = 'Submission Files';
const UPLOAD_SUBMISSION_FILE = 'Upload Submission File';
const ANONYMOUS = 'Anonymous Reviewer';
/** An email line's opening (Rule 7). */
const EMAIL_LINE = 'An email has been sent:';

/** "Date": a day alone, year-month-day (Settings bullet 1); a note's date and time (Settings bullet 2). */
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME = /^\s*\d{4}-\d{2}-\d{2} \d{1,2}:\d{2} [AP]M\s*$/;

/** An upload fixture's path. */
const fx = (name) => path.join(__dirname, '..', 'fixtures', 'files', name);

/** An account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A text with its whitespace folded. */
const flat = (text) => (text || '').replace(/\s+/g, ' ').trim();

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u38${scenario}ojsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** Seed a submission (on the seeded journal unless `context` is given). */
async function seed(ojsApi, tag, {context = JOURNAL, submitter = AUTHOR, ...extra} = {}) {
    return await ojsApi.createSubmission({tag, context, submitter, title: `Submission ${tag}`, ...extra});
}

/**
 * A scratch journal with throwaway accounts, `{key: [givenName, familyName,
 * roles]}`; returns them by key with `username` and `name`.
 */
async function seedJournal(ojsApi, tag, accounts, extra = {}) {
    const people = {};
    const users = [];
    for (const [key, [givenName, familyName, roles]] of Object.entries(accounts)) {
        const username = `${tag}${key}`;
        people[key] = {username, name: `${givenName} ${familyName}`};
        users.push({username, givenName, familyName, email: mailOf(username), roles});
    }
    await ojsApi.createContext({tag, context: {name: `Journal ${tag}`}, users, ...extra});
    return people;
}

/**
 * A page as `username` on the submission's workflow, with the Activity Log
 * reader and a recorder of the page's browser dialogs (any the test did
 * not script is accepted, the leave-page question included).
 */
async function openWorkflow(asUser, username, submissionId, {contextPath = JOURNAL, menuKey = null} = {}) {
    const page = await (await asUser(username)).newPage();
    const asked = recordBrowserDialogs(page);
    const frame = new WorkflowPage(page, contextPath);
    await frame.gotoEditorial(submissionId, {menuKey});
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
    test('S1: a note posted, read on "History" and deleted', {tag: '@smoke'}, async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        const people = await seedJournal(ojsApi, tag, {
            mg: ['Mira', 'Manager', ['manager']],
            se: ['Sean', 'Section', ['sectionEditor']],
            au: ['Ava', 'Author', ['author']],
        });
        const {submissionId} = await seed(ojsApi, `${tag}s`, {
            context: tag,
            submitter: people.au.username,
            participants: [{username: people.se.username, role: 'sectionEditor'}],
        });
        const MG = people.mg.name;
        const SE = people.se.name;

        const mg = await openWorkflow(asUser, people.mg.username, submissionId, {contextPath: tag});
        const log = mg.log;
        const address = mg.page.url();

        // The window: "History" first of "History" and "Notes"; the columns;
        // the submit line; every "Date" a day alone, newest first; Escape
        // closes it and leaves the workflow as it was (Rules 1, 2, 3).
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

        // The Section Editor's "Delete": the line and the note under the
        // manager's name; "Confirm" with its question, "OK" and "Cancel";
        // "Cancel" keeps the note; "OK": "Note deleted." and the empty
        // sentence (Actors row 5; Rule 10c).
        const se = await openWorkflow(asUser, people.se.username, submissionId, {contextPath: tag});
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

        // The line kept: "History" holds the same lines as when the Section
        // Editor opened it, and none for the deletion (Rule 10c; Side effects).
        await se.log.selectTab('History');
        // Compared as a multiset: lines logged in the same second have no
        // fixed order among them (Rule 2; fix list B, flake-s26).
        expect(unordered(await se.log.historyLines())).toEqual(unordered(seenBySe));
        await se.log.close();

        // Under "Login As": the administrator, acting as the Section Editor
        // through the Participants row's "Login As", posts a note: listed
        // under the Section Editor's name; its line reads "{administrator}
        // (acting as {Section Editor})" (Rules 4b, 10).
        const ad = await openWorkflow(asUser, ADMIN, submissionId, {contextPath: tag});
        const participants = new ParticipantsPanel(ad.page, tag);
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

        // The Journal Manager's "Delete" on the Section Editor's note: "Note
        // deleted."; "History" still lists both "Posted new note." lines
        // (Actors row 5; Rule 10c). Control: the older one reads the
        // manager's name alone (Rules 4a, 4b).
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

    test('S2: an email line and "View Email"', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const {submissionId} = await seed(ojsApi, tag);
        const {page, frame, log} = await openWorkflow(asUser, MANAGER, submissionId);
        const wizard = new DecisionWizardPage(page);
        const composer = new ComposerPage(page);

        // The decision: "Decline Submission" recorded with its email as the
        // email page offers it, its "Subject:" and letter noted (U34).
        await frame.actionButton('Decline Submission').click();
        await wizard.expectTitle('Decline Submission');
        await wizard.awaitComposerLoaded();
        await expect(composer.subjectInput()).not.toHaveValue('', {timeout: 30_000});
        const subject = await composer.subjectInput().inputValue();
        await expect.poll(() => composer.firstParagraphText(), {timeout: 30_000}).not.toBe('');
        const letter = flat(await composer.letterText());
        await wizard.recordDecision('Submission Declined');
        await wizard.viewSubmissionSummary();
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

    test('S3: file lines and "Download"', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const {submissionId} = await seed(ojsApi, tag, {files: [{file: 'article.pdf'}]});
        const {page, frame, log} = await openWorkflow(asUser, MANAGER, submissionId, {menuKey: MENU_KEYS.submission});
        const list = new FileList(page, frame, SUBMISSION_FILES);
        await list.expectNames(['article.pdf']);
        const number = await list.rowNumber(list.row('article.pdf'));

        const uploadLine = `Revision "article.pdf" was uploaded for file ${number}.`;
        const revisionLine = `A file revision "notes.md" was uploaded for submission ${submissionId} by ${MANAGER}.`;
        const metadataLine = `The metadata for file "notes.md" was edited by ${MANAGER}.`;
        const deletionLine = `A file "notes.md" was deleted for submission ${submissionId} by ${MANAGER}.`;

        // The upload's line, with an arrow; its "Download": article.pdf (Rules 5, 6, 6a).
        await log.open();
        const uploads = await log.linesWith(uploadLine);
        expect(uploads.map((l) => l.arrow)).toEqual([true]);
        let strip = await log.openStrip(uploadLine);
        let got = await log.download(strip);
        expect(got.download.suggestedFilename()).toBe('article.pdf');
        await log.close();

        // A revision: article.pdf revised with notes.md, "Continue" on
        // "2. Review Details", "Complete"; "History" gains the revision line
        // and the metadata line (Rule 6).
        await reland(page, frame, submissionId);
        await list.uploadButton().click();
        const wizard = new UploadWizard(page, UPLOAD_SUBMISSION_FILE);
        await wizard.expectOpen();
        await wizard.chooseRevision('article.pdf');
        await wizard.attach(fx('notes.md'), 'notes.md');
        await wizard.continueTo(WIZARD_STEPS[1]);
        await wizard.continueTo(WIZARD_STEPS[2]);
        await wizard.complete();
        await list.expectNames(['notes.md']);
        await log.open();
        expect((await log.linesWith(revisionLine)).map((l) => l.arrow)).toEqual([true]);
        // Control: the metadata line has no arrow (Rule 5).
        expect((await log.linesWith(metadataLine)).map((l) => l.arrow)).toEqual([false]);

        // Each version's "Download": notes.md from the revision line,
        // article.pdf still from the upload line (Rules 6a, 6b).
        strip = await log.openStrip(revisionLine);
        got = await log.download(strip);
        expect(got.download.suggestedFilename()).toBe('notes.md');
        strip = await log.openStrip(uploadLine);
        got = await log.download(strip);
        expect(got.download.suggestedFilename()).toBe('article.pdf');
        await log.close();

        // The file's own "History": the same revision line, its own arrow
        // and "Download" (Rule 6b).
        await reland(page, frame, submissionId);
        await list.choose(list.row('notes.md'), 'More Information');
        const info = new InformationCenter(page, 'notes.md');
        await info.expectOpen();
        await info.expectHistoryLoaded();
        await expect.poll(() => info.historyEvents()).toContain(revisionLine);
        await expect(info.historyRows().filter({hasText: revisionLine}).locator('a.show_extras')).toHaveCount(1);
        got = await info.downloadFromHistory(revisionLine);
        expect(got.download.suggestedFilename()).toBe('notes.md');
        await info.close();

        // The deletion: "History" gains its line; the upload and revision
        // lines keep their text and lose their arrows; the metadata line
        // still has none (Rules 5, 6, 6a).
        await reland(page, frame, submissionId);
        await list.choose(list.row('notes.md'), 'Delete');
        const answer = await new DeleteFileDialog(page).confirm();
        expect(answer.status()).toBe(200);
        await expect(list.noItems()).toBeVisible({timeout: 30_000});
        await log.open();
        expect(userEvents(await log.linesWith(deletionLine))).toHaveLength(1);
        expect((await log.linesWith(uploadLine)).map((l) => l.arrow)).toEqual([false]);
        expect((await log.linesWith(revisionLine)).map((l) => l.arrow)).toEqual([false]);
        expect((await log.linesWith(metadataLine)).map((l) => l.arrow)).toEqual([false]);
        await log.close();
    });

    test('S4: an editor who is also the author', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        const accepted = (name, id) => `The round 1 review assigned to ${name} for submission ${id} has been accepted.`;
        const declined = (name, id) => `The round 1 review assigned to ${name} for submission ${id} has been declined.`;
        const assigned = (name, id) => `${name} has been assigned to review submission ${id} for review round 1.`;
        const ACCEPTED = / has been accepted\.$/;
        const DECLINED = / has been declined\.$/;
        const ASSIGNED = / has been assigned to review submission \d+ for review round 1\.$/;

        // Given (footnote s0): a user holding Author and Section Editor who
        // submitted and is assigned as Section Editor; one Reviewer accepted,
        // another declined; on a journal at the install's review type
        // ("Anonymous Reviewer/Anonymous Author") and on one set to "Open".
        const build = async (journalTag, extra = {}) => {
            const people = await seedJournal(
                ojsApi,
                journalTag,
                {
                    ed: ['Eve', 'Editor', ['author', 'sectionEditor']],
                    ra: ['Rita', 'Reviewer', ['externalReviewer']],
                    rd: ['Rae', 'Reviewer', ['externalReviewer']],
                },
                extra
            );
            const seeded = await seed(ojsApi, `${journalTag}s`, {
                context: journalTag,
                submitter: people.ed.username,
                participants: [{username: people.ed.username, role: 'sectionEditor'}],
                decisions: ['sendExternalReview'],
                reviewRounds: [
                    {
                        reviewers: [
                            {username: people.ra.username, status: 'accepted'},
                            {username: people.rd.username, status: 'declined'},
                        ],
                    },
                ],
            });
            return {journalTag, people, submissionId: seeded.submissionId};
        };
        const anon = await build(`${tag}a`);
        const open = await build(`${tag}o`, {review: {defaultReviewMode: 'open'}});

        /** The review lines of a reader's "History" (acceptance, decline, assignment). */
        const reviewLines = async (username, journal) => {
            const {log} = await openWorkflow(asUser, username, journal.submissionId, {contextPath: journal.journalTag});
            await log.open();
            const lines = userEvents(await log.historyLines());
            await log.close();
            return {
                all: lines,
                accepted: lines.filter((l) => ACCEPTED.test(l.event)),
                declined: lines.filter((l) => DECLINED.test(l.event)),
                assigned: lines.filter((l) => ASSIGNED.test(l.event)).map((l) => l.event).sort(),
            };
        };
        const namesOf = (journal) => [
            journal.people.ra.name,
            journal.people.rd.name,
            journal.people.ra.username,
            journal.people.rd.username,
        ];

        // The author-editor's "History": "Anonymous Reviewer" under "User" on
        // the acceptance and the decline, and in the assignment lines; no
        // event line names either Reviewer (Rule 9, which states the event
        // lines; the email lines are Rule 4c's).
        const id = anon.submissionId;
        const own = await reviewLines(anon.people.ed.username, anon);
        expect(own.accepted).toEqual([{user: ANONYMOUS, event: accepted(ANONYMOUS, id)}]);
        expect(own.declined).toEqual([{user: ANONYMOUS, event: declined(ANONYMOUS, id)}]);
        expect(own.assigned).toEqual([assigned(ANONYMOUS, id), assigned(ANONYMOUS, id)]);
        for (const line of own.all.filter((l) => !l.event.startsWith(EMAIL_LINE))) {
            for (const name of namesOf(anon)) {
                expect(`${line.user} ${line.event}`, `"${line.event}" names no Reviewer`).not.toContain(name);
            }
        }

        // An "Open" review, read by its author-editor: the acceptance and the
        // decline name the Reviewer under "User"; two assignment lines (A8
        // parked: whose name they carry is not read) (Rule 9).
        const openLines = await reviewLines(open.people.ed.username, open);
        expect(openLines.accepted.map((l) => l.user)).toEqual([open.people.ra.name]);
        expect(openLines.declined.map((l) => l.user)).toEqual([open.people.rd.name]);
        expect(openLines.assigned).toHaveLength(2);

        // Control: the Journal Manager on the first journal's submission: the
        // Reviewers named under "User" and in the assignment lines (Rules 4a, 9).
        const manager = await reviewLines(ADMIN, anon);
        expect(manager.accepted).toEqual([{user: anon.people.ra.name, event: accepted(anon.people.ra.name, id)}]);
        expect(manager.declined).toEqual([{user: anon.people.rd.name, event: declined(anon.people.rd.name, id)}]);
        expect(manager.assigned).toEqual([assigned(anon.people.rd.name, id), assigned(anon.people.ra.name, id)].sort());
    });
});
