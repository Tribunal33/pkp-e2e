// @ts-check
/**
 * @file playwright/tests/U37-tasks-and-discussions.spec.js
 *
 * Tasks & discussions — OMP suite, one test per canonical scenario the spec
 * runs on a press (the common scenarios 1–9 and the journal-and-press
 * scenarios 10 and 11), in the press's own words: "Series editor" and
 * "Press manager" under a name, the template screen's "Internal Review
 * Stage" and "External Review Stage", and the External Review round.
 * Spec: docs/specs/U37-tasks-and-discussions.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1 🐞: the install mounts the app-changes row 12 overlay (bin/mount.js),
 *   so a press saves and notifies as a journal does; nothing reads the
 *   as-shipped crash.
 * - A2 🐞: no test reads the line under the "Add" window's title.
 * - A3 🐞: mail reads pick the message by its text; nothing counts the
 *   writer's own copy, and S5's no-mail control reads only mails that do
 *   not carry the reply.
 * - A5 🐞: S3 reads "Name", the message and the task box after a template
 *   press, never "Participants".
 * - A21 🐞: S2 and S8 read the field errors and the summary line, never the
 *   screen-reader list under it.
 * - A22 ✅ (retired 2026-09-29): every page still accepts the browser's
 *   leave-page prompt; no test asserts whether it appears.
 * - A25 🐞, A28 🐞: S5 reads the converted task's row, owner, date and
 *   messages, never whether it is started or its History's first line.
 * - A26 🐞: S4, S5 and S9 read the state after "No" only after a reload.
 * - A6 🐞: S10 reads the Copyeditor's menu entries and never saves "Edit".
 * - OMP1 🐞: S11 reads the reviewers' round line, never the role word
 *   under their name.
 * - A13 ❓: S4 reads that the closed task moved to "Closed" only.
 * - A18 ❓: S9 never reads the auto-added item's "Activity" or History.
 * - A20 ❓: S11 reads the cancelled reviewer's item's participants, never
 *   its "Edit".
 * - A4 🐞, A7 🐞, A8 🐞, A9 🐞, A10 🐞, A16 🐞, A17 🐞, A24 🐞, A29 🐞,
 *   A31 🐞, A12 ❓, A14 ❓, A15 ❓, A19 ❓, A23 ❓, A27 ❓, A30 ❓: no scenario
 *   reaches them here.
 * - OPS1, OPS2: other apps' territory.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only (A1, A7). Every test seeds its own submission with a unique
 * tag (M5); the items a scenario's given names come from `tasks[]` (footnote
 * s), acting as their creator, and every step of a scenario's body is driven
 * on screen. S1–S7, S10 and the anonymous half of S11 run on the seeded
 * press, in series `monographs`, whose submissions arrive with the series'
 * editors assigned (`sectioneditor.ana`, `sectioneditor.omar`,
 * `editor.diana`); S8, S9 and the "Open" half of S11 run on scratch presses
 * with throwaway accounts. Items seeded in one call share a second, so a
 * row is always found by its name, never by its position. The roster's
 * mailboxes are shared by every worker (A8): a mail is picked by its
 * recipient, its subject and the submission's own footer mark ("#{id}
 * Author", every discussion email's "Reply to this comment at …" line),
 * then by its text. Every absence is read settled (the panel's three groups
 * fetched, an exact list, a mail read after a control) and paired with a
 * positive control taken the same way (M4, M6). A move issued at once after a side window closes can
 * still meet the closing form's leave-page handler (spec Rule 11d):
 * every page accepts the prompt. S9's auto-add box is ticked on screen,
 * then the submission is seeded, as footnote s says; S11's "Cancel
 * Reviewer" is the Reviewers panel's own control. Waits are web-first (A5).
 * Everything runs in the parallel `omp` project.
 */
const path = require('path');
const {test, expect} = require('../support/fixtures.js');
const {TasksPanel} = require('../../../../shared/playwright/pages/NotificationsPages.js');
const {ReviewWizardPage} = require('../../../../shared/playwright/pages/ReviewerPages.js');
const {cancelReviewer} = require('../pages/ReviewerAssignmentPages.js');
const {
    TEXT,
    TasksDiscussionsPanel,
    ItemWindow,
    DiscussionWindow,
    HistoryWindow,
    QuestionDialog,
    TaskTemplatesTab,
    downloadFromNewTab,
} = require('../../../../shared/playwright/pages/TasksDiscussionsPages.js');

const PRESS = 'publicknowledge';
const SERIES = 'monographs';
const MANAGER = 'manager.maya';
const SECTION_EDITOR = 'sectioneditor.ana';
const SECOND_SECTION_EDITOR = 'sectioneditor.omar';
const AUTHOR = 'author.alex';
const COPYEDITOR = 'copyeditor.carla';
const REVIEWER = 'reviewer.julia';
const SECOND_REVIEWER = 'reviewer.paul';

/** Full names of the roster accounts the scenarios read (users.js). */
const NAME = {
    [MANAGER]: 'Maya Manager',
    [SECTION_EDITOR]: 'Ana Section Editor',
    [SECOND_SECTION_EDITOR]: 'Omar Section Editor',
    [AUTHOR]: 'Alex Author',
    [COPYEDITOR]: 'Carla Copyeditor',
    [REVIEWER]: 'Julia Reviewer',
    [SECOND_REVIEWER]: 'Paul Reviewer',
};

/** OMP's role names as the screens spell them (no reviewer role word: spec OMP1). */
const ROLE = {
    manager: 'Press manager',
    sectionEditor: 'Series editor',
    author: 'Author',
    copyeditor: 'Copyeditor',
};

/** The panels' headings (spec Purpose) and the stages' menu keys. */
const PANEL = {
    submission: 'Desk Review Tasks & Discussions',
    review: 'Review Tasks & Discussions',
    copyediting: 'Copyediting Tasks & Discussions',
    production: 'Production Tasks & Discussions',
};
const MENU_KEY = {submission: 'workflow_1', copyediting: 'workflow_4', production: 'workflow_5'};
/** A review round's menu key (the External Review stage is 3 on a press). */
const reviewKey = (round) => `workflow_${round.stageId}_${round.id}`;

/** Decisions that bring a seeded submission to a stage (footnote s). */
const TO_PRODUCTION = ['skipExternalReview', 'sendToProduction'];

const DATE = /\d{4}-\d{2}-\d{2}/.source;
const DATE_TIME = /\d{4}-\d{2}-\d{2} \d{1,2}:\d{2} [AP]M/;

/** An upload fixture's path. */
const fx = (name) => path.join(__dirname, '..', 'fixtures', 'files', name);

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u37${scenario}ompw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A calendar date as YYYY-MM-DD in the install's zone (UTC), `offset` days from today. */
function isoDate(offset = 0) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
}

/** An account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A text with its whitespace folded. */
const flat = (text) => (text || '').replace(/\s+/g, ' ').trim();

/** An anchored RegExp for a literal text. */
const esc = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The footer mark of a discussion email about the submission: "Reply to
 * this comment at #{id} {first author's family name}". Every seeded and
 * throwaway author here has the family name "Author".
 */
const footerMark = (submissionId) => `#${submissionId} Author`;

/**
 * Seed a monograph: on the seeded press in series `monographs`, whose
 * editors are assigned at the submit (footnote s); on a scratch press (no
 * series) as it comes.
 */
async function seed(ompApi, tag, {context = PRESS, submitter = AUTHOR, ...extra} = {}) {
    return await ompApi.createSubmission({
        tag,
        context,
        submitter,
        title: `Submission ${tag}`,
        ...(context === PRESS ? {series: SERIES} : {}),
        ...extra,
    });
}

/**
 * A scratch press with throwaway accounts, `{key: [givenName, familyName,
 * roles]}`; returns them by key with `username` and `name`.
 */
async function seedPress(ompApi, tag, accounts, extra = {}) {
    const people = {};
    for (const [key, [givenName, familyName, roles]] of Object.entries(accounts)) {
        const username = `${key}${tag}`;
        people[key] = {username, givenName, familyName, roles, name: `${givenName} ${familyName}`};
    }
    await ompApi.createContext({
        tag,
        context: {name: `Press ${tag}`},
        users: Object.values(people).map(({username, givenName, familyName, roles}) => ({username, givenName, familyName, roles})),
        ...extra,
    });
    return people;
}

/**
 * A signed-in page for `username`. It accepts the browser's leave-page
 * prompt a move issued at once after a side window closes can still meet
 * (spec Rule 11d), so a later navigation never hangs on it.
 */
async function pageFor(asUser, username) {
    const page = await (await asUser(username)).newPage();
    page.on('dialog', (dialog) => (dialog.type() === 'beforeunload' ? dialog.accept() : dialog.dismiss()).catch(() => {}));
    return page;
}

/** `username`'s page with a stage's panel open (editorial view). */
async function panelAs(asUser, username, submissionId, stage, {contextPath = PRESS, menuKey = null} = {}) {
    const page = await pageFor(asUser, username);
    const panel = new TasksDiscussionsPanel(page, contextPath, {title: PANEL[stage]});
    await panel.gotoEditorial(submissionId, menuKey || MENU_KEY[stage]);
    return {page, panel};
}

/** `username`'s page with a stage's panel open in the author's view. */
async function authorPanelAs(asUser, username, submissionId, stage, {contextPath = PRESS, menuKey = null} = {}) {
    const page = await pageFor(asUser, username);
    const panel = new TasksDiscussionsPanel(page, contextPath, {title: PANEL[stage]});
    await panel.gotoAuthor(submissionId, menuKey || MENU_KEY[stage]);
    return {page, panel};
}

/**
 * The mails to `username` with `subject` about the submission, newest
 * first, as full messages: the recipient-scoped Mailpit search pkpMail's
 * `find` and `count` run (recipient, subject and the submission's footer
 * mark), read whole, since a roster inbox is shared by every worker and one
 * submission can hold several mails of one subject.
 */
async function mailsAbout(pkpMail, username, subject, submissionId) {
    const result = await pkpMail._search({to: mailOf(username), subject, contains: footerMark(submissionId)});
    const out = [];
    for (const summary of result.messages || []) {
        out.push(await pkpMail.fullMessage(summary.ID));
    }
    return out;
}

/** Wait for the mail to `username` with `subject` about the submission whose text holds `text`; returns it. */
async function mailWith(pkpMail, username, subject, submissionId, text) {
    let found = null;
    await expect
        .poll(
            async () => {
                found = (await mailsAbout(pkpMail, username, subject, submissionId)).find((m) =>
                    flat(m.Text).includes(text)
                );
                return !!found;
            },
            {timeout: 30_000, message: `a mail to ${username} "${subject}" holding "${text}"`}
        )
        .toBe(true);
    return found;
}

/** The names of a mail's attachments. */
const attachmentNames = (message) => (message.Attachments || []).map((a) => a.FileName);

test.describe('tasks and discussions', () => {
    test('S1: open a discussion and reply', {tag: '@smoke'}, async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        const title = `Submission ${tag}`;
        const {submissionId} = await seed(ompApi, tag, {decisions: TO_PRODUCTION, files: [{file: 'article.pdf'}]});
        const NAME_ = 'Figure permissions';
        const FIRST = 'Please confirm the permissions for figure 2.';
        const REPLY = 'Permissions confirmed for figure 2.';
        const FILE_REPLY = 'The signed form is attached.';

        // The panel: heading, line, "Add", the columns and the three empty groups.
        const jm = await panelAs(asUser, MANAGER, submissionId, 'production');
        await expect(jm.panel.heading()).toHaveText(PANEL.production);
        await expect(jm.panel.line()).toBeVisible();
        await expect(jm.panel.addButton()).toBeVisible();
        expect(await jm.panel.columnLabels()).toEqual(TEXT.columns);
        expect(await jm.panel.groupLabels()).toEqual(TEXT.groups);
        for (const group of TEXT.groups) {
            await expect(jm.panel.emptyGroup(group)).toHaveCount(1);
        }
        await expect(jm.panel.itemRows()).toHaveCount(0);

        // The "Add" window: title, badge "New", the three groups; the
        // Journal Manager listed "(Me)" and ticked, the Section Editor
        // unticked with "Section editor" under the name.
        const add = await jm.panel.openAdd();
        await expect(add.heading()).toHaveText(PANEL.production);
        await expect(add.badge('New')).toBeVisible();
        for (const group of TEXT.windowGroups) {
            await expect(add.group(group)).toBeVisible();
        }
        await expect(add.participantBox(MANAGER)).toBeChecked();
        await expect(add.participantLabel(MANAGER)).toContainText(`${NAME[MANAGER]} (${MANAGER}) (Me)`);
        await expect(add.participantBox(SECTION_EDITOR)).not.toBeChecked();
        await expect(add.participantLabel(SECTION_EDITOR)).toContainText(`${NAME[SECTION_EDITOR]} (${SECTION_EDITOR})`);
        await expect(add.participantLabel(SECTION_EDITOR)).toHaveText(new RegExp(`\\(${esc(SECTION_EDITOR)}\\)\\s*${ROLE.sectionEditor}\\s*$`));
        await expect(add.participantLabel(SECTION_EDITOR)).not.toContainText('(Me)');

        // "Save": the window closes; the row under "In progress".
        await add.nameField().fill(NAME_);
        await add.typeMessage(FIRST);
        await add.tick(SECTION_EDITOR);
        await add.saveExpectClosed();
        await expect(jm.page.getByText(TEXT.serverNotice)).toHaveCount(0);
        await jm.panel.expectInGroup(NAME_, 'In progress');
        await expect(jm.panel.typeWord(NAME_)).toHaveText(/^\s*Discussion\s*$/);
        await expect(jm.panel.ownerLine(NAME_)).toHaveText(`Created by: ${MANAGER}`);
        await expect(jm.panel.dueDateCell(NAME_)).toHaveText(/^\s*$/);
        await expect(jm.panel.activityCell(NAME_)).toHaveText(
            new RegExp(`^\\s*Discussion created by ${esc(MANAGER)} \\(${ROLE.manager}\\) on ${DATE}\\s*$`)
        );

        // The Section Editor's email and Tasks row.
        const firstMail = await mailWith(pkpMail, SECTION_EDITOR, NAME_, submissionId, FIRST);
        expect(firstMail.From.Address).toBe(mailOf(MANAGER));
        expect(firstMail.From.Name).toBe(NAME[MANAGER]);
        expect(flat(firstMail.Text).startsWith(FIRST)).toBe(true);
        expect(flat(firstMail.Text)).toContain(`Reply to this comment at ${footerMark(submissionId)}`);
        expect(firstMail.HTML).toMatch(/href="[^"]*notification\/unsubscribe[^"]*">unsubscribe<\/a>/);
        const sePage = await pageFor(asUser, SECTION_EDITOR);
        await sePage.goto(`/index.php/${PRESS}/dashboard/editorial`);
        const seTasks = new TasksPanel(sePage);
        await expect(seTasks.bell()).toBeVisible({timeout: 30_000});
        await seTasks.open();
        await expect(seTasks.row(title).filter({hasText: `${NAME[MANAGER]} started a discussion: ${NAME_}`})).toHaveCount(1);
        await seTasks.close();

        // The Section Editor's view: no "More Actions", a greyed "Closed"
        // box; the window with its badge, participants and message, and
        // neither "Edit" nor "Close this Discussion".
        const se = {page: sePage, panel: new TasksDiscussionsPanel(sePage, PRESS, {title: PANEL.production})};
        await se.panel.gotoEditorial(submissionId, MENU_KEY.production);
        await se.panel.expectInGroup(NAME_, 'In progress');
        await expect(se.panel.menuButton(NAME_)).toHaveCount(0);
        await expect(se.panel.closedBox(NAME_)).toBeDisabled();
        const seWin = await se.panel.openItem(NAME_);
        await expect(seWin.heading()).toHaveText(NAME_);
        await expect(seWin.badge('In progress')).toBeVisible();
        await expect.poll(async () => (await seWin.participantUsernames()).sort()).toEqual([MANAGER, SECTION_EDITOR].sort());
        await expect(seWin.participantLines()).toHaveText([/^1\. .+ \(\S+\)/, /^2\. .+ \(\S+\)/]);
        await expect(seWin.details()).toContainText(`${NAME[MANAGER]} (${MANAGER})`);
        await expect(seWin.details()).toContainText(`${NAME[SECTION_EDITOR]} (${SECTION_EDITOR})`);
        await expect(seWin.details()).toContainText(ROLE.sectionEditor);
        await expect(seWin.messages()).toHaveCount(1);
        await expect(seWin.messageHead(0)).toContainText(`Message from ${MANAGER}`);
        await expect(seWin.messageHead(0)).toHaveText(DATE_TIME);
        await expect(seWin.messageBody(0)).toHaveText(FIRST);
        await expect(seWin.editButton()).toHaveCount(0);
        await expect(seWin.statusBox('Close this Discussion')).toHaveCount(0);

        // The reply: the box opens and the button greys; an empty "Save" is
        // refused; the typed reply is added at the end, and "Saved" shows.
        await seWin.addNewMessage();
        await expect(seWin.addNewMessageButton()).toBeDisabled();
        await seWin.pressSave();
        await expect(seWin.replyError()).toHaveText(TEXT.required);
        await expect(seWin.messages()).toHaveCount(1);
        await seWin.typeReply(REPLY);
        await seWin.saveReply();
        await expect(seWin.messages()).toHaveCount(2);
        await expect(seWin.messageHead(1)).toContainText(`Message from ${SECTION_EDITOR}`);
        await expect(seWin.messageBody(1)).toHaveText(REPLY);

        // The Journal Manager's side: "Activity" lists the reply and the
        // opening; the reply by email.
        await jm.panel.reland();
        await expect(jm.panel.activityListItems(NAME_)).toHaveText([
            new RegExp(`^${esc(SECTION_EDITOR)} \\(${ROLE.sectionEditor}\\) posted a response on ${DATE}$`),
            new RegExp(`^Discussion created by ${esc(MANAGER)} \\(${ROLE.manager}\\) on ${DATE}$`),
        ]);
        await mailWith(pkpMail, MANAGER, NAME_, submissionId, REPLY);

        // A workflow file: "Attach Files" offers both sources; "Submission"
        // and article.pdf; listed with "Remove"; saved, the message links it
        // and it downloads; the Journal Manager's email carries it, and
        // "Submission Files" still lists it once.
        await se.panel.reland();
        const seWin2 = await se.panel.openItem(NAME_);
        await seWin2.addNewMessage();
        const attach = await seWin2.openAttachFiles();
        expect(await attach.sourceHeadings()).toEqual(['Upload File', 'Workflow Files']);
        await expect(attach.uploadButton()).toBeVisible();
        await attach.openWorkflowFiles();
        await attach.chooseStage('Submission');
        await attach.attachWorkflowFile('article.pdf');
        await expect(seWin2.attachedFile('article.pdf')).toBeVisible();
        await expect(seWin2.removeButtons()).toHaveCount(1);
        await seWin2.typeReply(FILE_REPLY);
        await seWin2.saveReply();
        await expect(seWin2.messages()).toHaveCount(3);
        await expect(seWin2.messageBody(2)).toHaveText(FILE_REPLY);
        await expect(seWin2.fileLink('article.pdf')).toHaveCount(1);
        const download = await downloadFromNewTab(sePage, () => seWin2.fileLink('article.pdf').click());
        expect(download.suggestedFilename()).toMatch(/\.pdf$/);
        const fileMail = await mailWith(pkpMail, MANAGER, NAME_, submissionId, FILE_REPLY);
        expect(attachmentNames(fileMail)).toContain('article.pdf');

        // Control: the Journal Manager is offered "More Actions", "Edit" and
        // the "Close this Discussion" box the Section Editor was not.
        await jm.panel.reland();
        await expect(jm.panel.menuButton(NAME_)).toHaveCount(1);
        await expect(jm.panel.closedBox(NAME_)).toBeEnabled();
        const jmWin = await jm.panel.openItem(NAME_);
        await expect(jmWin.editButton()).toBeVisible();
        await expect(jmWin.statusBox('Close this Discussion')).toBeVisible();

        // The attached copy left the submission's file where it was:
        // "Submission Files" lists article.pdf once.
        await jm.panel.frame.gotoEditorial(submissionId, {menuKey: MENU_KEY.submission});
        const submissionFiles = jm.panel.frame.panel('Submission Files');
        await expect(submissionFiles.getByRole('row').filter({hasText: 'article.pdf'})).toHaveCount(1, {timeout: 30_000});
    });

    test('S2: what the "Add" window refuses, and "Cancel"', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const {submissionId} = await seed(ompApi, tag, {decisions: TO_PRODUCTION});
        const NAME_ = 'Layout question';
        const MESSAGE = 'Is the layout final?';
        const jm = await panelAs(asUser, MANAGER, submissionId, 'production');

        // Required fields: "Save" at once.
        let add = await jm.panel.openAdd();
        await add.saveRefusedOnPage();
        await expect(add.fieldError('title')).toHaveText(TEXT.required);
        await expect(add.fieldError('description')).toHaveText(TEXT.required);
        await add.expectErrorSummary('Please correct 2 errors.');
        await expect(add.jumpToNextError()).toBeVisible();

        // One participant: the server's refusal under "Participants".
        await add.nameField().fill(NAME_);
        await add.typeMessage(MESSAGE);
        await expect(add.checkedParticipantBoxes()).toHaveCount(1);
        await expect(add.participantBox(MANAGER)).toBeChecked();
        await add.saveExpectRefused();
        await expect(add.fieldError('participants')).toHaveText(TEXT.twoParticipants);
        await add.expectErrorSummary('Please correct one error.');

        // A task with nobody ticked.
        await add.taskBox().check();
        await expect(add.dueDate()).toBeVisible();
        await expect(add.ownerHeading()).toBeVisible();
        await expect(add.startSelect()).toBeVisible();
        expect(await add.startSelectLabel()).toBe(TEXT.startOnSave);
        await add.dueDate().fill(isoDate(7));
        await add.tick(MANAGER, false);
        await expect(add.checkedParticipantBoxes()).toHaveCount(0);
        await add.saveRefusedOnPage();
        await expect(add.fieldError('participants')).toHaveText(TEXT.required);
        await expect(add.fieldError('taskInfoAssignee')).toHaveText(TEXT.required);

        // No owner chosen: one radio button per ticked person, and the
        // owner still refused. "Save" stays greyed after the refusal above
        // until an owner is chosen, so the refusal under the owner list is
        // read without a second press (.reports/U37/test-ojs-findings.md
        // T-ojs-1).
        await add.tick(MANAGER);
        await add.tick(SECTION_EDITOR);
        await expect.poll(() => add.ownerUsernames()).toEqual([MANAGER, SECTION_EDITOR]);
        await expect(add.fieldError('taskInfoAssignee')).toHaveText(TEXT.required);

        // The owner unticked: the radio button goes, "Save" is refused.
        await add.ownerRadio(SECTION_EDITOR).check();
        await add.tick(SECTION_EDITOR, false);
        await expect(add.ownerRadio(SECTION_EDITOR)).toHaveCount(0);
        await expect.poll(() => add.ownerUsernames()).toEqual([MANAGER]);
        await add.saveExpectRefused();
        await expect(add.fieldError('participants')).toHaveText(TEXT.oneOwner);

        // "Cancel" on a changed window: "Warning"; "No" keeps it; Escape asks
        // again; "Yes" closes it and the panel is as it was.
        await add.cancelButton().click();
        const warning = add.warning();
        await warning.expectOpen(TEXT.warning);
        expect(await warning.buttonLabels()).toEqual(['Yes', 'No']);
        await warning.answer('No');
        await expect(add.root).toBeVisible();
        await expect(add.nameField()).toHaveValue(NAME_);
        await add.nameField().focus();
        // lint-ok: escape Rule 11c claims the key; the focus is in the window's box and the window is the top layer
        await jm.page.keyboard.press('Escape');
        await warning.expectOpen(TEXT.warning);
        await warning.answer('Yes');
        await expect(add.root).toHaveCount(0, {timeout: 30_000});
        for (const group of TEXT.groups) {
            await expect(jm.panel.emptyGroup(group)).toHaveCount(1);
        }
        await expect(jm.panel.itemRows()).toHaveCount(0);

        // An untouched window closes at once.
        await jm.panel.reland();
        add = await jm.panel.openAdd();
        await add.cancelUntouched();

        // Control: the same discussion with the Section Editor ticked saves.
        await jm.panel.reland();
        add = await jm.panel.openAdd();
        await add.nameField().fill(NAME_);
        await add.typeMessage(MESSAGE);
        await add.tick(SECTION_EDITOR);
        await add.saveExpectClosed();
        await jm.panel.expectInGroup(NAME_, 'In progress');
    });

    test('S3: templates in the "Add" window', async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const {submissionId} = await seed(ompApi, tag, {decisions: TO_PRODUCTION});
        const jm = await panelAs(asUser, MANAGER, submissionId, 'production');

        // The list: the stage's discussion templates, each over its line.
        let add = await jm.panel.openAdd();
        await expect(add.templatesLabel()).toBeVisible();
        for (const name of ['Discussion (Production)', 'Assign Editor']) {
            const button = add.templateButton('Discussion', name);
            await expect(button).toBeVisible();
            await expect(button.locator('div').first()).toHaveText(`DISCUSSION - ${name}`, {useInnerText: true});
            await expect(button).toContainText(TEXT.discussionTemplateLine);
        }

        // "Find Template": typing alone changes nothing; Enter narrows; the
        // clear control brings the whole list back.
        const all = await add.templateNames();
        expect(all).toEqual(expect.arrayContaining(['Discussion - Discussion (Production)', 'Discussion - Assign Editor']));
        await add.findTemplate().fill('assign');
        await expect(add.templateButton('Discussion', 'Discussion (Production)')).toBeVisible();
        expect(await add.templateNames()).toEqual(all);
        await add.findTemplate().press('Enter');
        await expect(add.templateButton('Discussion', 'Discussion (Production)')).toHaveCount(0, {timeout: 30_000});
        await expect(add.templateButton('Discussion', 'Assign Editor')).toBeVisible();
        await add.clearSearch().click();
        await expect(add.templateButton('Discussion', 'Discussion (Production)')).toBeVisible({timeout: 30_000});
        await expect.poll(() => add.templateNames()).toEqual(all);

        // Choosing a template fills "Name" and the message; the task box stays unticked.
        await add.nameField().fill('Layout check');
        await add.pressTemplate('Discussion', 'Discussion (Production)');
        await expect(add.nameField()).toHaveValue('Discussion (Production)');
        await expect.poll(() => add.messageText()).toBe('Please enter your message.');
        await expect(add.taskBox()).not.toBeChecked();

        // Placeholders filled on "Save".
        await add.pressTemplate('Discussion', 'Assign Editor');
        await expect(add.nameField()).toHaveValue('Assign Editor');
        await expect.poll(() => add.messageText()).toMatch(/^Dear /);
        expect(await add.messageHtml()).toMatch(/recipientName/);
        await add.tick(SECTION_EDITOR);
        await add.saveExpectClosed();
        await jm.panel.expectInGroup('Assign Editor', 'In progress');
        const win = await jm.panel.openItem('Assign Editor');
        await expect(win.messageBody(0)).toHaveText(new RegExp(`^\\s*Dear ${esc(NAME[SECTION_EDITOR])},`));
        const mail = await mailWith(pkpMail, SECTION_EDITOR, 'Assign Editor', submissionId, `Dear ${NAME[SECTION_EDITOR]},`);
        expect(flat(mail.Text).startsWith(`Dear ${NAME[SECTION_EDITOR]},`)).toBe(true);

        // Control: "production" finds "Discussion (Production)" again.
        await jm.panel.reland();
        add = await jm.panel.openAdd();
        await add.findTemplate().fill('production');
        await add.findTemplate().press('Enter');
        await expect(add.templateButton('Discussion', 'Assign Editor')).toHaveCount(0, {timeout: 30_000});
        await expect(add.templateButton('Discussion', 'Discussion (Production)')).toBeVisible();
    });

    test('S4: a task: begun, started, closed, overdue', async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        const OVERDUE = 'Update the references';
        const BEGUN = 'Prepare the galley note';
        const NOT_STARTED = 'Check the proofs';
        const REPLY = 'Thanks, the proofs are final.';
        const pastDue = isoDate(-3);
        const {submissionId} = await seed(ompApi, tag, {
            decisions: TO_PRODUCTION,
            tasks: [
                {
                    title: OVERDUE,
                    type: 'task',
                    creator: MANAGER,
                    participants: [MANAGER, SECTION_EDITOR],
                    owner: SECTION_EDITOR,
                    dateDue: pastDue,
                },
            ],
        });
        const jm = await panelAs(asUser, MANAGER, submissionId, 'production');

        // "Begin Task Upon Saving": the owner list follows the ticks.
        let add = await jm.panel.openAdd();
        await add.nameField().fill(BEGUN);
        await add.taskBox().check();
        await expect.poll(() => add.ownerUsernames()).toEqual([MANAGER]);
        await add.tick(SECTION_EDITOR);
        await expect.poll(() => add.ownerUsernames()).toEqual([MANAGER, SECTION_EDITOR]);
        await add.ownerRadio(SECTION_EDITOR).check();
        await add.dueDate().fill(isoDate(14));
        expect(await add.startSelectLabel()).toBe(TEXT.startOnSave);
        await add.typeMessage('Please prepare the galley note.');
        await add.saveExpectClosed();
        await jm.panel.expectInGroup(BEGUN, 'In progress');
        await expect(jm.panel.typeWord(BEGUN)).toHaveText(/^\s*Task\s*$/);
        await expect(jm.panel.ownerLine(BEGUN)).toHaveText(`Task Owner: ${SECTION_EDITOR}`);
        await expect(jm.panel.dueDateCell(BEGUN)).toHaveText(isoDate(14));

        // "Create Task (Do Not Start)": under "Yet to begin"; the Section Editor is emailed.
        await jm.panel.reland();
        add = await jm.panel.openAdd();
        await add.nameField().fill(NOT_STARTED);
        await add.taskBox().check();
        await add.tick(SECTION_EDITOR);
        await add.ownerRadio(SECTION_EDITOR).check();
        await add.dueDate().fill(isoDate(7));
        await add.startSelect().selectOption({label: TEXT.createNotStarted});
        await add.typeMessage('Please check the proofs.');
        await add.saveExpectClosed();
        await jm.panel.expectInGroup(NOT_STARTED, 'Yet to begin');
        await mailWith(pkpMail, SECTION_EDITOR, NOT_STARTED, submissionId, 'Please check the proofs.');

        // Started from the row by the Section Editor: "No" leaves it; "Yes" moves it.
        const se = await panelAs(asUser, SECTION_EDITOR, submissionId, 'production');
        await se.panel.expectInGroup(NOT_STARTED, 'Yet to begin');
        await expect(se.panel.menuButton(NOT_STARTED)).toHaveCount(1);
        await expect(se.panel.startedBox(NOT_STARTED)).toBeEnabled();
        await expect(se.panel.startedBox(NOT_STARTED)).not.toBeChecked();
        await se.panel.pressBox(NOT_STARTED, 'Started');
        const start = new QuestionDialog(se.page, 'Start this task');
        await start.expectOpen(TEXT.startQuestion);
        expect(await start.buttonLabels()).toEqual(['Yes', 'No']);
        await se.panel.answerRowQuestion('Start this task', 'No');
        await se.panel.reland();
        await se.panel.expectInGroup(NOT_STARTED, 'Yet to begin');
        await se.panel.pressBox(NOT_STARTED, 'Started');
        await start.expectOpen(TEXT.startQuestion);
        await se.panel.answerRowQuestion('Start this task', 'Yes');
        await se.panel.expectInGroup(NOT_STARTED, 'In progress');
        await expect(se.panel.startedBox(NOT_STARTED)).toBeChecked();
        await expect(se.panel.startedBox(NOT_STARTED)).toBeDisabled();

        // The start recorded: the window and the History.
        await jm.panel.reland();
        let win = await jm.panel.openItem(NOT_STARTED);
        await expect(win.taskInformation().getByRole('heading', {name: 'Task started by', exact: true})).toBeVisible();
        await expect(win.taskInformation().getByRole('heading', {name: 'Start Date', exact: true})).toBeVisible();
        await win.close();
        await jm.panel.reland();
        let history = await jm.panel.openHistory(NOT_STARTED);
        await expect(
            history.row(new RegExp(`^Task initiated by ${esc(SECTION_EDITOR)} \\(${ROLE.sectionEditor}\\) on ${DATE}$`))
        ).toHaveCount(1);
        await history.close();

        // Closed from the row by the Section Editor.
        await se.panel.reland();
        await se.panel.pressBox(NOT_STARTED, 'Closed');
        const closeTask = new QuestionDialog(se.page, 'Close this Task');
        await closeTask.expectOpen(TEXT.closeTaskQuestion);
        await se.panel.answerRowQuestion('Close this Task', 'Yes');
        await se.panel.expectInGroup(NOT_STARTED, 'Closed');
        await se.panel.reland();
        history = await se.panel.openHistory(NOT_STARTED);
        await expect(history.row(new RegExp(`^Task closed by ${esc(SECTION_EDITOR)} on ${DATE}$`))).toHaveCount(1);
        await history.close();

        // A reply on the closed task reaches the Section Editor.
        await jm.panel.reland();
        win = await jm.panel.openItem(NOT_STARTED);
        await expect(win.badge('Closed')).toBeVisible();
        await win.addNewMessage();
        await win.typeReply(REPLY);
        await win.saveReply();
        await expect(win.messages()).toHaveCount(2);
        await expect(win.messageBody(1)).toHaveText(REPLY);
        await mailWith(pkpMail, SECTION_EDITOR, NOT_STARTED, submissionId, REPLY);
        await win.close();

        // The overdue task: under "In progress", its "Activity", badge and History.
        await jm.panel.reland();
        await jm.panel.expectInGroup(OVERDUE, 'In progress');
        await expect(jm.panel.activityCell(OVERDUE)).toHaveText(TEXT.overdue);
        win = await jm.panel.openItem(OVERDUE);
        await expect(win.badge('Overdue')).toBeVisible();
        await win.close();
        await jm.panel.reland();
        history = await jm.panel.openHistory(OVERDUE);
        const entries = await history.entries();
        expect(entries[0]).toEqual({date: pastDue, user: '', event: TEXT.overdue, download: ''});
        await history.close();

        // Control: the task due in fourteen days reads "In progress", not "Overdue".
        await jm.panel.reland();
        win = await jm.panel.openItem(BEGUN);
        await expect(win.badge('In progress')).toBeVisible();
        await expect(win.badge('Overdue')).toHaveCount(0);
    });

    test('S5: close, reopen, and turn a discussion into a task', async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s5', testInfo);
        const NAME_ = 'Cover image';
        const REPLY = 'One more change to the cover.';
        const {submissionId} = await seed(ompApi, tag, {
            decisions: TO_PRODUCTION,
            tasks: [{title: NAME_, creator: MANAGER, participants: [MANAGER, SECTION_EDITOR]}],
        });
        const jm = await panelAs(asUser, MANAGER, submissionId, 'production');

        // Closed from the row: "No" leaves it; "Yes" moves it.
        await jm.panel.expectInGroup(NAME_, 'In progress');
        await jm.panel.pressBox(NAME_, 'Closed');
        const closeDialog = new QuestionDialog(jm.page, 'Close this Discussion');
        await closeDialog.expectOpen(TEXT.closeDiscussionQuestion);
        expect(await closeDialog.buttonLabels()).toEqual(['Yes', 'No']);
        await jm.panel.answerRowQuestion('Close this Discussion', 'No');
        await jm.panel.reland();
        await jm.panel.expectInGroup(NAME_, 'In progress');
        await jm.panel.pressBox(NAME_, 'Closed');
        await closeDialog.expectOpen(TEXT.closeDiscussionQuestion);
        await jm.panel.answerRowQuestion('Close this Discussion', 'Yes');
        await jm.panel.expectInGroup(NAME_, 'Closed');

        // The closed discussion's menu and History.
        await jm.panel.reland();
        await jm.panel.openMenu(NAME_);
        expect(await jm.panel.menuLabels()).toEqual(['Edit', 'History', 'Delete']);
        await expect(jm.panel.menuItem('Edit')).toBeDisabled();
        await jm.panel.menuItem('History').click();
        let history = new HistoryWindow(jm.page);
        await history.expectReady();
        await expect(history.row(new RegExp(`^Discussion closed by ${esc(MANAGER)} on ${DATE}$`))).toHaveCount(1);
        await history.close();

        // A reply on the closed discussion reaches the Journal Manager.
        const se = await panelAs(asUser, SECTION_EDITOR, submissionId, 'production');
        const seWin = await se.panel.openItem(NAME_);
        await seWin.addNewMessage();
        await seWin.typeReply(REPLY);
        await seWin.saveReply();
        await expect(seWin.messages()).toHaveCount(2);
        await mailWith(pkpMail, MANAGER, NAME_, submissionId, REPLY);

        // Reopened from the window, with no question.
        await jm.panel.reland();
        let win = await jm.panel.openItem(NAME_);
        await expect(win.badge('Closed')).toBeVisible();
        await expect(win.statusBox('Close this Discussion')).toBeChecked();
        await expect(win.editButton()).toBeDisabled();
        await expect(win.taskInformation()).toContainText(TEXT.convertHintClosed);
        await win.statusBox('Close this Discussion').uncheck();
        await win.saveStatus();
        await expect(jm.page.getByRole('dialog', {name: 'Reopen this Discussion'})).toHaveCount(0);
        await expect(win.badge('In progress')).toBeVisible();
        await win.close();
        await jm.panel.reland();
        await jm.panel.expectInGroup(NAME_, 'In progress');
        history = await jm.panel.openHistory(NAME_);
        await expect(history.row(new RegExp(`^Discussion reopened by ${esc(MANAGER)} on ${DATE}$`))).toHaveCount(1);
        await history.close();

        // "Add Task Details": the task box ticked and in view; saved, the row is a task.
        await jm.panel.reland();
        const details = await jm.panel.openEdit(NAME_, 'Add Task Details');
        await expect(details.taskBox()).toBeChecked();
        await expect(details.taskBox()).toBeInViewport();
        await details.ownerRadio(SECTION_EDITOR).check();
        await details.dueDate().fill(isoDate(7));
        await details.saveExpectClosed();
        await jm.panel.reland();
        await expect(jm.panel.typeWord(NAME_)).toHaveText(/^\s*Task\s*$/);
        await expect(jm.panel.ownerLine(NAME_)).toHaveText(`Task Owner: ${SECTION_EDITOR}`);
        await expect(jm.panel.dueDateCell(NAME_)).toHaveText(isoDate(7));
        win = await jm.panel.openItem(NAME_);
        await expect(win.messages()).toHaveCount(2);
        await win.close();

        // The task's menu: no "Add Task Details"; "Edit" has the task box ticked and greyed.
        await jm.panel.reland();
        await jm.panel.openMenu(NAME_);
        expect(await jm.panel.menuLabels()).toEqual(['Edit', 'History', 'Delete']);
        await jm.panel.menuItem('Edit').click();
        const edit = new ItemWindow(jm.page);
        await edit.expectReady();
        await expect(edit.taskBox()).toBeChecked();
        await expect(edit.taskBox()).toBeDisabled();
        await edit.cancelUntouched();

        // Control: the Journal Manager holds the Section Editor's reply (above);
        // no mail about the submission reached the Section Editor from the
        // close or the reopen (every "Cover image" mail they hold carries the reply).
        const seMails = await mailsAbout(pkpMail, SECTION_EDITOR, NAME_, submissionId);
        expect(seMails.filter((m) => !flat(m.Text).includes(REPLY)).map((m) => flat(m.Text).slice(0, 80))).toEqual([]);
    });

    test('S6: edit a discussion, read its History, delete it', async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s6', testInfo);
        const title = `Submission ${tag}`;
        const OLD = 'Proof corrections';
        const NEW = 'Final proof corrections';
        const OLD_TEXT = 'Please send your corrections.';
        const NEW_TEXT = 'Please send your final corrections.';
        const IMAGE = 'profile-image-400.png';
        const {submissionId} = await seed(ompApi, tag, {
            decisions: TO_PRODUCTION,
            tasks: [{title: OLD, creator: MANAGER, participants: [MANAGER, SECTION_EDITOR, AUTHOR], message: OLD_TEXT}],
        });

        // The Author sees the discussion before the edit (the control for
        // "no longer" below), and the Section Editor holds its Tasks row
        // (the control for the delete).
        const au = await authorPanelAs(asUser, AUTHOR, submissionId, 'production');
        await au.panel.expectInGroup(OLD, 'In progress');
        const sePage = await pageFor(asUser, SECTION_EDITOR);
        await sePage.goto(`/index.php/${PRESS}/dashboard/editorial`);
        let seTasks = new TasksPanel(sePage);
        await expect(seTasks.bell()).toBeVisible({timeout: 30_000});
        await seTasks.open();
        await expect(seTasks.row(title).filter({hasText: /started a discussion: /})).toHaveCount(1);
        await seTasks.close();

        // The row menu, in order, "Delete" in red.
        const jm = await panelAs(asUser, MANAGER, submissionId, 'production');
        let win = await jm.panel.openItem(OLD);
        const firstHead = flat(await win.messageHead(0).innerText());
        await win.close();
        await jm.panel.reland();
        await jm.panel.openMenu(OLD);
        expect(await jm.panel.menuLabels()).toEqual(['Edit', 'Add Task Details', 'History', 'Delete']);
        await expect(jm.panel.menuItem('Delete')).toHaveClass(/text-negative/);
        await expect(jm.panel.menuItem('Edit')).toHaveClass(/text-primary/);

        // "Edit": the window with the item's participants and first message.
        await jm.panel.menuItem('Edit').click();
        const edit = new ItemWindow(jm.page);
        await edit.expectReady();
        await expect(edit.heading()).toHaveText(PANEL.production);
        await expect(edit.badge('In progress')).toBeVisible();
        await expect(edit.nameField()).toHaveValue(OLD);
        for (const username of [MANAGER, SECTION_EDITOR, AUTHOR]) {
            await expect(edit.participantBox(username)).toBeChecked();
        }
        await expect(edit.participantBox(SECOND_SECTION_EDITOR)).not.toBeChecked();
        await expect.poll(() => edit.messageText()).toBe(OLD_TEXT);

        // The edit saved.
        await edit.nameField().fill(NEW);
        await edit.tick(SECOND_SECTION_EDITOR);
        await edit.tick(AUTHOR, false);
        await edit.typeMessage(NEW_TEXT);
        const attach = await edit.openAttachFiles();
        await attach.upload(fx(IMAGE));
        await expect(edit.attachedFile(IMAGE)).toBeVisible();
        await edit.saveExpectClosed();
        await jm.panel.reland();
        await expect(jm.panel.row(NEW)).toHaveCount(1);
        await expect(jm.panel.row(OLD)).toHaveCount(0);

        // Who is told: the newly ticked Section Editor.
        const told = await mailWith(pkpMail, SECOND_SECTION_EDITOR, NEW, submissionId, NEW_TEXT);
        expect(flat(told.Text).startsWith(NEW_TEXT)).toBe(true);

        // The discussion window: the new participants and the rewritten first
        // message, with the time it had.
        win = await jm.panel.openItem(NEW);
        await expect.poll(async () => (await win.participantUsernames()).sort()).toEqual([MANAGER, SECTION_EDITOR, SECOND_SECTION_EDITOR].sort());
        await expect(win.messages()).toHaveCount(1);
        await expect(win.messageBody(0)).toHaveText(NEW_TEXT);
        expect(flat(await win.messageHead(0).innerText())).toBe(firstHead);
        await win.close();

        // "History": the title, the item's name, the columns, newest first,
        // full names under "User"; the edit's lines, and none for the new
        // name or text.
        await jm.panel.reland();
        const history = await jm.panel.openHistory(NEW);
        await expect(history.subtitle(NEW)).toBeVisible();
        expect(await history.columnLabels()).toEqual(['Date', 'User', 'Event', 'Download']);
        const expected = [
            new RegExp(`^${esc(SECOND_SECTION_EDITOR)} \\(${ROLE.sectionEditor}\\) added by ${esc(MANAGER)} \\(${ROLE.manager}\\) on ${DATE}$`),
            new RegExp(`^${esc(AUTHOR)} \\(${ROLE.author}\\) removed by ${esc(MANAGER)} \\(${ROLE.manager}\\) on ${DATE}$`),
            new RegExp(`^${esc(IMAGE)} uploaded by ${esc(MANAGER)} on ${DATE}$`),
            new RegExp(`^Discussion created by ${esc(MANAGER)} \\(${ROLE.manager}\\) on ${DATE}$`),
        ];
        const entries = await history.entries();
        expect(entries.map((e) => e.event)).toHaveLength(expected.length);
        for (const pattern of expected) {
            expect(entries.filter((e) => pattern.test(e.event)), `one line ${pattern}`).toHaveLength(1);
        }
        expect(entries[entries.length - 1].event).toMatch(expected[3]);
        for (const entry of entries) {
            expect(entry.user).toBe(NAME[MANAGER]);
            expect(entry.event).not.toContain('final');
        }
        const uploadRow = history.row(new RegExp(`^${esc(IMAGE)} uploaded by`));
        const [download] = await Promise.all([jm.page.waitForEvent('download'), history.downloadLink(uploadRow).click()]);
        expect(download.suggestedFilename()).toMatch(/\.png$/);
        await expect(history.root).toBeVisible();
        await history.close();

        // The Author's panel no longer lists the discussion.
        await au.panel.reland();
        await au.panel.expectNoRow(NEW);
        await expect(au.panel.row(OLD)).toHaveCount(0);

        // "Delete": "Cancel" keeps the row; "OK" removes it and its Tasks row.
        await jm.panel.reland();
        let dialog = await jm.panel.openDelete(NEW);
        expect(await dialog.buttonLabels()).toEqual(['OK', 'Cancel']);
        await expect(dialog.button('OK')).toHaveClass(/negative/);
        await dialog.answer('Cancel');
        await jm.panel.reland();
        await expect(jm.panel.row(NEW)).toHaveCount(1);
        dialog = await jm.panel.openDelete(NEW);
        const deleted = jm.page.waitForResponse(
            (r) => new RegExp(`/tasks/\\d+$`).test(new URL(r.url()).pathname) && r.request().method() === 'POST',
            {timeout: 30_000}
        );
        await dialog.answer('OK');
        expect((await deleted).status()).toBe(200);
        await jm.panel.reland();
        await jm.panel.expectNoRow(NEW);
        await sePage.reload();
        seTasks = new TasksPanel(sePage);
        await expect(seTasks.bell()).toBeVisible({timeout: 30_000});
        await seTasks.open();
        await expect(seTasks.grid()).toBeVisible();
        await expect(seTasks.row(title).filter({hasText: /started a discussion: /})).toHaveCount(0);

        // Control: the edit told only the newly added participant.
        for (const username of [AUTHOR, SECTION_EDITOR]) {
            expect(await mailsAbout(pkpMail, username, NEW, submissionId)).toEqual([]);
        }
    });

    test('S7: the Author\'s discussions', async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s7', testInfo);
        const QUERIES = 'Proof queries';
        const NOTES = 'Editorial notes';
        const FIGURE = 'Figure 3';
        const REPLY = 'The proofs look fine.';
        const IMAGE = 'profile-image-400.png';
        const {submissionId} = await seed(ompApi, tag, {
            decisions: TO_PRODUCTION,
            tasks: [
                {title: QUERIES, creator: SECTION_EDITOR, participants: [SECTION_EDITOR, AUTHOR]},
                {title: NOTES, creator: MANAGER, participants: [MANAGER, SECTION_EDITOR]},
            ],
        });

        // The Author's panel: "Proof queries", no "More Actions".
        const au = await authorPanelAs(asUser, AUTHOR, submissionId, 'production');
        await au.panel.expectInGroup(QUERIES, 'In progress');
        await expect(au.panel.menuButton(QUERIES)).toHaveCount(0);
        await expect(au.panel.row(NOTES)).toHaveCount(0);

        // The reply reaches the Section Editor.
        let win = await au.panel.openItem(QUERIES);
        await expect(win.editButton()).toHaveCount(0);
        await win.addNewMessage();
        await win.typeReply(REPLY);
        await win.saveReply();
        await expect(win.messages()).toHaveCount(2);
        await expect(win.messageHead(1)).toContainText(`Message from ${AUTHOR}`);
        await expect(win.messageBody(1)).toHaveText(REPLY);
        await mailWith(pkpMail, SECTION_EDITOR, QUERIES, submissionId, REPLY);
        await win.close();

        // Who the Author is offered: themselves "(Me)" and the Section Editor,
        // not the Journal Manager.
        await au.panel.reland();
        const add = await au.panel.openAdd();
        await expect(add.participantBox(AUTHOR)).toBeChecked();
        await expect(add.participantLabel(AUTHOR)).toContainText(`${NAME[AUTHOR]} (${AUTHOR}) (Me)`);
        await expect(add.participantBox(SECTION_EDITOR)).toHaveCount(1);
        await expect(add.participantBox(MANAGER)).toHaveCount(0);

        // The creator unticked.
        await add.nameField().fill(FIGURE);
        await add.typeMessage('Here is the corrected figure 3.');
        await add.tick(AUTHOR, false);
        await add.tick(SECTION_EDITOR);
        await add.saveExpectRefused();
        await expect(add.fieldError('participants')).toContainText(TEXT.creatorMust);

        // An uploaded file: "Upload File" and no "Workflow Files".
        await add.tick(AUTHOR);
        const attach = await add.openAttachFiles();
        expect(await attach.sourceHeadings()).toEqual(['Upload File']);
        await expect(attach.uploadButton()).toBeVisible();
        await expect(attach.workflowButton()).toHaveCount(0);
        await attach.upload(fx(IMAGE));
        await expect(add.attachedFile(IMAGE)).toBeVisible();
        await expect(add.removeButtons()).toHaveCount(1);
        await add.saveExpectClosed();
        await au.panel.reland();
        await au.panel.expectInGroup(FIGURE, 'In progress');
        await expect(au.panel.ownerLine(FIGURE)).toHaveText(`Created by: ${AUTHOR}`);
        win = await au.panel.openItem(FIGURE);
        await expect(win.fileLink(IMAGE)).toHaveCount(1);
        const download = await downloadFromNewTab(au.page, () => win.fileLink(IMAGE).click());
        expect(download.suggestedFilename()).toMatch(/\.png$/);

        // The Section Editor's email: the subject, the Author as sender, the file.
        const mail = await mailWith(pkpMail, SECTION_EDITOR, FIGURE, submissionId, 'Here is the corrected figure 3.');
        expect(mail.From.Address).toBe(mailOf(AUTHOR));
        expect(attachmentNames(mail)).toContain(IMAGE);

        // The Journal Manager, not a participant: every item, and no reply.
        const jm = await panelAs(asUser, MANAGER, submissionId, 'production');
        await jm.panel.expectInGroup(QUERIES, 'In progress');
        await jm.panel.expectInGroup(FIGURE, 'In progress');
        const jmWin = await jm.panel.openItem(FIGURE);
        await expect(jmWin.noAccessLine()).toBeVisible();
        await expect(jmWin.addNewMessageButton()).toHaveCount(0);
        await jmWin.close();

        // Control: the Journal Manager's panel lists "Editorial notes", which
        // the Author's did not.
        await jm.panel.reland();
        await jm.panel.expectInGroup(NOTES, 'In progress');
    });

    test('S8: manage the templates', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s8', testInfo);
        const p = await seedPress(ompApi, tag, {
            mg: ['Mira', 'Manager', ['manager']],
            se: ['Sam', 'Section', ['sectionEditor']],
            au: ['Ava', 'Author', ['author']],
        });
        const NOTES = 'Layout notes';
        const {submissionId} = await seed(ompApi, tag, {
            context: tag,
            submitter: p.au.username,
            decisions: TO_PRODUCTION,
            participants: [{username: p.se.username, role: 'sectionEditor'}],
            tasks: [{title: NOTES, creator: p.mg.username, participants: [p.mg.username, p.se.username]}],
        });
        const PRODUCTION_STAGE = 'Production Stage';

        // The screen: the table, its line, the press's stage groups with
        // "Add template" ("Internal Review Stage" reading "No Items"), and the
        // installed Production templates, boxes unticked.
        const mgPage = await pageFor(asUser, p.mg.username);
        const templates = new TaskTemplatesTab(mgPage, tag);
        await templates.goto();
        await expect(templates.tableHeading()).toBeVisible();
        await expect(templates.line()).toBeVisible();
        expect(await templates.columnLabels()).toEqual(TEXT.templateColumns);
        const stages = ['Submission Stage', 'Internal Review Stage', 'External Review Stage', 'Copyediting Stage', PRODUCTION_STAGE];
        await expect.poll(() => templates.groupLabels()).toEqual(stages);
        for (const stage of stages) {
            await expect(templates.addTemplateButton(stage)).toBeVisible();
        }
        expect(await templates.templateNames('Internal Review Stage')).toEqual([`[${TEXT.noItems}]`]);
        expect(await templates.templateNames('External Review Stage')).toEqual(expect.arrayContaining(['Discussion (Review)', 'Assign Editor']));
        expect(await templates.templateNames(PRODUCTION_STAGE)).toEqual(expect.arrayContaining(['Discussion (Production)', 'Assign Editor']));
        for (const name of ['Discussion (Production)', 'Assign Editor']) {
            await expect(templates.autoAddBox(name, PRODUCTION_STAGE)).not.toBeChecked();
        }

        // Required fields.
        let win = await templates.openAdd(PRODUCTION_STAGE);
        await expect(win.heading()).toHaveText(`Add Task and Discussion Template in ${PRODUCTION_STAGE}`);
        await win.radio('Limit access to specific roles').check();
        await win.taskBox().check();
        await win.saveButton().click();
        for (const field of ['title', 'userGroupIds', 'dueInterval', 'description']) {
            await expect(win.fieldError(field), `the error under ${field}`).toHaveText(TEXT.required);
        }
        await expect(win.root).toBeVisible();

        // A limited task template, listed first.
        await win.nameField().fill('Proof check');
        await win.roleBox(ROLE.sectionEditor).check();
        await win.dueSelect().selectOption({label: '2 weeks from the creation date'});
        await win.typeMessage('Please check the proofs.');
        await win.saveExpectClosed();
        await expect.poll(async () => (await templates.templateNames(PRODUCTION_STAGE))[0]).toBe('Proof check');

        // "Edit": renamed.
        win = await templates.openEdit('Proof check', PRODUCTION_STAGE);
        await expect(win.heading()).toHaveText('Edit Task and Discussion Template');
        await win.nameField().fill('Final proof check');
        await win.saveExpectClosed();
        await expect(templates.row('Final proof check', PRODUCTION_STAGE)).toHaveCount(1);
        await expect(templates.row('Proof check', PRODUCTION_STAGE)).toHaveCount(0);

        // The Section Editor's "Add" window: the task template fills the form.
        const se = await panelAs(asUser, p.se.username, submissionId, 'production', {contextPath: tag});
        let add = await se.panel.openAdd();
        const taskButton = add.templateButton('Task', 'Final proof check');
        await expect(taskButton).toBeVisible();
        await expect(taskButton.locator('div').first()).toHaveText('TASK - Final proof check', {useInnerText: true});
        await expect(taskButton).toContainText(TEXT.taskTemplateLine);
        await add.pressTemplate('Task', 'Final proof check');
        await expect(add.nameField()).toHaveValue('Final proof check');
        await expect.poll(() => add.messageText()).toBe('Please check the proofs.');
        await expect(add.taskBox()).toBeChecked();
        await expect(add.dueDate()).toHaveValue(isoDate(14));
        await expect(add.root.locator('input[name="taskInfoAssignee"]:checked')).toHaveCount(0);
        await add.ownerRadio(p.se.username).check();
        await add.saveExpectClosed();
        await se.panel.expectInGroup('Final proof check', 'In progress');

        // The Author's "Add" window: the unrestricted discussion template, not the limited one.
        const au = await authorPanelAs(asUser, p.au.username, submissionId, 'production', {contextPath: tag});
        add = await au.panel.openAdd();
        await expect(add.templateButton('Discussion', 'Discussion (Production)')).toBeVisible();
        await expect(add.templateButton('Task', 'Final proof check')).toHaveCount(0);
        await add.cancelUntouched();

        // A task template on a discussion's "Edit": "Apply Template" asks;
        // "No" changes nothing; "Yes" fills; "Cancel" › "Yes" keeps the discussion.
        const mg = {page: mgPage, panel: new TasksDiscussionsPanel(mgPage, tag, {title: PANEL.production})};
        await mg.panel.gotoEditorial(submissionId, MENU_KEY.production);
        const edit = await mg.panel.openEdit(NOTES);
        await expect(edit.templateButton('Task', 'Final proof check')).toBeVisible();
        await edit.templateButton('Task', 'Final proof check').click();
        const apply = new QuestionDialog(mgPage, 'Apply Template');
        await apply.expectOpen(TEXT.applyTemplateQuestion);
        expect(await apply.buttonLabels()).toEqual(['Yes', 'No']);
        await apply.answer('No');
        await expect(edit.nameField()).toHaveValue(NOTES);
        await edit.templateButton('Task', 'Final proof check').click();
        await apply.expectOpen(TEXT.applyTemplateQuestion);
        const fetched = mgPage.waitForResponse((r) => r.url().includes('/tasks/fromTemplate/'), {timeout: 30_000});
        await apply.answer('Yes');
        await fetched;
        await expect(edit.nameField()).toHaveValue('Final proof check');
        await expect(edit.taskBox()).toBeChecked();
        await expect(edit.dueDate()).not.toHaveValue('');
        await edit.cancelButton().click();
        await edit.warning().expectOpen(TEXT.warning);
        await edit.warning().answer('Yes');
        await expect(edit.root).toHaveCount(0, {timeout: 30_000});
        await mg.panel.reland();
        await expect(mg.panel.typeWord(NOTES)).toHaveText(/^\s*Discussion\s*$/);
        await expect(mg.panel.row('Final proof check')).toHaveCount(1);

        // "Delete": the template leaves the list and the Section Editor's
        // window; the task made from it stays.
        await templates.goto();
        const dialog = await templates.openDelete('Final proof check', PRODUCTION_STAGE);
        await dialog.answer('OK');
        await expect(templates.row('Final proof check', PRODUCTION_STAGE)).toHaveCount(0, {timeout: 30_000});
        await expect(templates.row('Discussion (Production)', PRODUCTION_STAGE)).toHaveCount(1);
        await se.panel.reland();
        await expect(se.panel.row('Final proof check')).toHaveCount(1);
        add = await se.panel.openAdd();
        await expect(add.templateButton('Discussion', 'Discussion (Production)')).toBeVisible();
        await expect(add.templateButton('Task', 'Final proof check')).toHaveCount(0);
        await add.cancelUntouched();

        // The Section Editor refused the Settings address; the Journal Manager, the control, has the tab.
        await se.page.goto(templates.url());
        await expect(se.page.getByText('The current role does not have access to this operation.')).toBeVisible({timeout: 30_000});
        await expect(templates.tab()).toBeVisible();
    });

    test('S9: "Auto-add at stage"', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s9', testInfo);
        const p = await seedPress(ompApi, tag, {
            mg: ['Mira', 'Manager', ['manager']],
            se: ['Sam', 'Section', ['sectionEditor']],
            au: ['Ava', 'Author', ['author']],
        });
        const STAGE = 'Submission Stage';
        const TEMPLATE = 'Discussion (Submission)';

        // Switching it on: "No" saves nothing (read after a reload); "Yes"
        // saves it, and the template's window shows the box ticked.
        const mgPage = await pageFor(asUser, p.mg.username);
        const templates = new TaskTemplatesTab(mgPage, tag);
        await templates.goto();
        await expect(templates.autoAddBox(TEMPLATE, STAGE)).not.toBeChecked();
        let question = await templates.pressAutoAdd(TEMPLATE, STAGE);
        await question.expectOpen(TEXT.autoAddOnQuestion(STAGE));
        expect(await question.buttonLabels()).toEqual(['Yes', 'No']);
        await question.answer('No');
        await templates.goto();
        await expect(templates.autoAddBox(TEMPLATE, STAGE)).not.toBeChecked();
        question = await templates.pressAutoAdd(TEMPLATE, STAGE);
        await question.expectOpen(TEXT.autoAddOnQuestion(STAGE));
        const toast = expect(mgPage.locator('.pkpNotification').filter({hasText: TEXT.savedToast})).toBeVisible({timeout: 30_000});
        toast.catch(() => {});
        await question.answer('Yes');
        await toast;
        await templates.goto();
        await expect(templates.autoAddBox(TEMPLATE, STAGE)).toBeChecked();
        const win = await templates.openEdit(TEMPLATE, STAGE);
        await expect(win.autoAddBox()).toBeChecked();
        await win.cancelButton().click();
        await expect(win.root).toHaveCount(0, {timeout: 30_000});

        // The Author's submission arrives with the Section Editor assigned.
        const {submissionId} = await seed(ompApi, tag, {
            context: tag,
            submitter: p.au.username,
            participants: [{username: p.se.username, role: 'sectionEditor'}],
        });

        // The item the template makes: by "system", no participants, its one message.
        const mg = {page: mgPage, panel: new TasksDiscussionsPanel(mgPage, tag, {title: PANEL.submission})};
        await mg.panel.gotoEditorial(submissionId, MENU_KEY.submission);
        await mg.panel.expectInGroup(TEMPLATE, 'In progress');
        await expect(mg.panel.ownerLine(TEMPLATE)).toHaveText('Created by: system');
        await expect(mg.panel.dueDateCell(TEMPLATE)).toHaveText(/^\s*$/);
        await mg.panel.nameButton(TEMPLATE).click();
        const item = new DiscussionWindow(mgPage, TEMPLATE);
        await item.expectReady({participants: false});
        await expect(item.messages()).toHaveCount(1);
        await expect(item.messageHead(0)).toContainText('Message from system');
        await expect(item.messageBody(0)).toHaveText('Please enter your message.');
        await expect(item.participantLines()).toHaveCount(0);
        await item.close();

        // Not yet the Section Editor's.
        const se = await panelAs(asUser, p.se.username, submissionId, 'submission', {contextPath: tag});
        await se.panel.expectNoRow(TEMPLATE);

        // Participants added: one alone is refused; two save.
        await mg.panel.reland();
        const edit = await mg.panel.openEdit(TEMPLATE);
        await edit.tick(p.mg.username, false);
        await edit.tick(p.se.username);
        await expect(edit.checkedParticipantBoxes()).toHaveCount(1);
        await edit.saveExpectRefused();
        await expect(edit.fieldError('participants')).toHaveText(TEXT.twoParticipants);
        await edit.tick(p.mg.username);
        await edit.saveExpectClosed();
        await se.panel.reland();
        await se.panel.expectInGroup(TEMPLATE, 'In progress');

        // Control: no item from "Assign Editor", whose box stayed off.
        await mg.panel.reland();
        await expect(mg.panel.row(TEMPLATE)).toHaveCount(1);
        await expect(mg.panel.row('Assign Editor')).toHaveCount(0);
    });

    test('S10: the Copyeditor\'s task', async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s10', testInfo);
        const TASK = 'Copyedit the manuscript';
        const NOTES = 'Editorial notes';
        const REPLY = 'Copyedits done; my notes are attached.';
        const due = isoDate(14);
        const {submissionId} = await seed(ompApi, tag, {
            decisions: ['skipExternalReview'],
            participants: [{username: COPYEDITOR, role: 'copyeditor'}],
            tasks: [
                {
                    title: TASK,
                    type: 'task',
                    creator: MANAGER,
                    participants: [MANAGER, COPYEDITOR],
                    owner: COPYEDITOR,
                    dateDue: due,
                    started: false,
                },
                {title: NOTES, creator: MANAGER, participants: [MANAGER, SECTION_EDITOR]},
            ],
        });

        // The Copyeditor's panel: the task under "Yet to begin", its menu.
        const ce = await panelAs(asUser, COPYEDITOR, submissionId, 'copyediting');
        await ce.panel.expectInGroup(TASK, 'Yet to begin');
        await expect(ce.panel.ownerLine(TASK)).toHaveText(`Task Owner: ${COPYEDITOR}`);
        await expect(ce.panel.row(NOTES)).toHaveCount(0);
        await ce.panel.openMenu(TASK);
        expect(await ce.panel.menuLabels()).toEqual(['Edit', 'History', 'Delete']);
        await ce.panel.closeMenu(TASK);

        // Started from the window, with no question.
        const win = await ce.panel.openItem(TASK);
        await expect(win.badge('Yet to begin')).toBeVisible();
        const info = win.taskInformation();
        await expect(info.getByRole('heading', {name: 'Due Date', exact: true})).toBeVisible();
        await expect(info).toContainText(due);
        await expect(info.getByRole('heading', {name: 'Responsible to complete this task (Task owner)', exact: true})).toBeVisible();
        await expect(info).toContainText(`(${COPYEDITOR})`);
        await expect(win.statusBox('Start this task')).toBeVisible();
        await win.statusBox('Start this task').check();
        await win.saveStatus();
        await expect(ce.page.getByRole('dialog', {name: 'Start this task'})).toHaveCount(0);
        await expect(win.badge('In progress')).toBeVisible();
        await expect(info.getByRole('heading', {name: 'Task started by', exact: true})).toBeVisible();
        await expect(info.getByRole('heading', {name: 'Start Date', exact: true})).toBeVisible();

        // A reply with an uploaded file.
        await win.addNewMessage();
        const attach = await win.openAttachFiles();
        expect(await attach.sourceHeadings()).toEqual(['Upload File', 'Workflow Files']);
        await attach.upload(fx('notes.md'));
        await expect(win.attachedFile('notes.md')).toBeVisible();
        await win.typeReply(REPLY);
        await win.saveReply();
        await expect(win.messages()).toHaveCount(2);
        await expect(win.fileLink('notes.md')).toHaveCount(1);

        // Completed from the window.
        await win.statusBox('Complete this task').check();
        await win.saveStatus();
        await expect(win.badge('Closed')).toBeVisible();

        // The Journal Manager's side: under "Closed"; the History; the reply by email with the file.
        const jm = await panelAs(asUser, MANAGER, submissionId, 'copyediting');
        await jm.panel.expectInGroup(TASK, 'Closed');
        const history = await jm.panel.openHistory(TASK);
        await expect(history.row(new RegExp(`^Task initiated by ${esc(COPYEDITOR)} \\(${ROLE.copyeditor}\\) on ${DATE}$`))).toHaveCount(1);
        await expect(history.row(new RegExp(`^${esc(COPYEDITOR)} \\(${ROLE.copyeditor}\\) posted a response on ${DATE}$`))).toHaveCount(1);
        const upload = history.row(new RegExp(`^notes\\.md uploaded by ${esc(COPYEDITOR)} on ${DATE}$`));
        await expect(upload).toHaveCount(1);
        await expect(history.downloadLink(upload)).toBeVisible();
        await expect(history.row(new RegExp(`^Task closed by ${esc(COPYEDITOR)} on ${DATE}$`))).toHaveCount(1);
        await history.close();
        const mail = await mailWith(pkpMail, MANAGER, TASK, submissionId, REPLY);
        expect(attachmentNames(mail)).toContain('notes.md');

        // Control: the Journal Manager's panel lists "Editorial notes", which the Copyeditor's did not.
        await jm.panel.reland();
        await jm.panel.expectInGroup(NOTES, 'In progress');
    });

    test('S11: reviewers and the Author on a review stage', async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(360_000);
        const tag = makeTag('s11', testInfo);
        const QUESTION = 'Question for the reviewer';
        const REPLY = 'Figure 2 is fine now.';
        const ANONYMOUS = 'Round 1 - Anonymous Reviewer/Anonymous Author';
        const seeded = await seed(ompApi, tag, {
            decisions: ['sendExternalReview'],
            reviewRounds: [
                {
                    reviewers: [
                        {username: REVIEWER, status: 'accepted'},
                        {username: SECOND_REVIEWER, status: 'accepted'},
                    ],
                },
            ],
        });
        const {submissionId} = seeded;
        const roundKey = reviewKey(seeded.reviewRounds[0]);

        // Who the Section Editor is offered: themselves, the Author, both
        // Reviewers with their round line (the role word above it is OMP1's).
        const se = await panelAs(asUser, SECTION_EDITOR, submissionId, 'review', {menuKey: roundKey});
        let add = await se.panel.openAdd();
        await expect(add.participantBox(SECTION_EDITOR)).toBeChecked();
        await expect(add.participantLabel(SECTION_EDITOR)).toContainText('(Me)');
        await expect(add.participantBox(AUTHOR)).toHaveCount(1);
        for (const reviewer of [REVIEWER, SECOND_REVIEWER]) {
            await expect(add.participantLabel(reviewer)).toContainText(`${NAME[reviewer]} (${reviewer})`);
            await expect(add.participantLabel(reviewer)).toContainText(ANONYMOUS);
        }

        // Two reviewers, then a reviewer with the Author, refused; saved alone.
        await add.nameField().fill(QUESTION);
        await add.typeMessage('Please look again at figure 2.');
        await add.tick(REVIEWER);
        await add.tick(SECOND_REVIEWER);
        await add.saveExpectRefused();
        await expect(add.fieldError('participants')).toContainText(TEXT.reviewersIdentity);
        await add.tick(SECOND_REVIEWER, false);
        await add.tick(AUTHOR);
        await add.saveExpectRefused();
        await expect(add.fieldError('participants')).toContainText(TEXT.authorsWithReviewers);
        await add.tick(AUTHOR, false);
        await add.saveExpectClosed();
        await se.panel.expectInGroup(QUESTION, 'In progress');
        await expect(se.panel.ownerLine(QUESTION)).toHaveText(`Created by: ${SECTION_EDITOR}`);
        await expect(se.panel.menuButton(QUESTION)).toHaveCount(1);

        // The Reviewer's panel on step 3 of the review form, and the reply.
        const rvPage = await pageFor(asUser, REVIEWER);
        const wizard = new ReviewWizardPage(rvPage, PRESS);
        await wizard.goto(submissionId);
        await wizard.expectStep(1);
        await wizard.saveAndContinueButton.click();
        await wizard.expectStep(2);
        await wizard.continueToStep3Button.click();
        await wizard.expectStep(3);
        const rv = new TasksDiscussionsPanel(rvPage, PRESS, {title: PANEL.review});
        await rv.expectSettled();
        await expect(wizard.tabPanel(3).locator('[data-cy="discussion-manager"]')).toHaveCount(1);
        await rv.expectInGroup(QUESTION, 'In progress');
        const rvWin = await rv.openItem(QUESTION);
        await rvWin.addNewMessage();
        await rvWin.typeReply(REPLY);
        await rvWin.saveReply();
        await expect(rvWin.messages()).toHaveCount(2);
        await mailWith(pkpMail, SECTION_EDITOR, QUESTION, submissionId, REPLY);
        await rvWin.close();

        // Who the Reviewer is offered: themselves and the Section Editor,
        // neither the Author nor the other Reviewer.
        await rvPage.goto(wizard.url(submissionId, 3));
        await wizard.expectStep(3);
        await rv.expectSettled();
        add = await rv.openAdd();
        await expect(add.participantLabel(REVIEWER)).toContainText('(Me)');
        await expect(add.participantBox(SECTION_EDITOR)).toHaveCount(1);
        await expect(add.participantBox(AUTHOR)).toHaveCount(0);
        await expect(add.participantBox(SECOND_REVIEWER)).toHaveCount(0);
        await add.cancelUntouched();

        // The Author on the review stage: the Section Editor, no Reviewer, no row.
        const au = await authorPanelAs(asUser, AUTHOR, submissionId, 'review', {menuKey: roundKey});
        await au.panel.expectNoRow(QUESTION);
        add = await au.panel.openAdd();
        await expect(add.participantBox(SECTION_EDITOR)).toHaveCount(1);
        await expect(add.participantBox(REVIEWER)).toHaveCount(0);
        await expect(add.participantBox(SECOND_REVIEWER)).toHaveCount(0);
        await add.cancelUntouched();

        // A cancelled request: the item stays, the Section Editor alone in it.
        await se.panel.reland();
        const reviewerRow = se.page.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: NAME[REVIEWER]});
        await cancelReviewer(se.page, reviewerRow);
        await se.panel.reland();
        await expect(reviewerRow).toContainText('Request Cancelled', {timeout: 30_000});
        await se.panel.expectInGroup(QUESTION, 'In progress');
        const seWin = await se.panel.openItem(QUESTION);
        await expect.poll(() => seWin.participantUsernames()).toEqual([SECTION_EDITOR]);
        await seWin.close();

        // The Section Editor's list after the cancel: the second Reviewer, not the first.
        await se.panel.reland();
        add = await se.panel.openAdd();
        await expect(add.participantBox(SECOND_REVIEWER)).toHaveCount(1);
        await expect(add.participantBox(REVIEWER)).toHaveCount(0);
        await add.cancelUntouched();

        // An "Open" review on a scratch press.
        const openTag = makeTag('s11o', testInfo);
        const p = await seedPress(
            ompApi,
            openTag,
            {
                se: ['Sam', 'Section', ['sectionEditor']],
                au: ['Ava', 'Author', ['author']],
                ra: ['Rhea', 'Accepted', ['externalReviewer']],
                rw: ['Rory', 'Waiting', ['externalReviewer']],
                rd: ['Rita', 'Declined', ['externalReviewer']],
            },
            {review: {defaultReviewMode: 'open'}}
        );
        const open = await seed(ompApi, openTag, {
            context: openTag,
            submitter: p.au.username,
            participants: [{username: p.se.username, role: 'sectionEditor'}],
            decisions: ['sendExternalReview'],
            reviewRounds: [
                {
                    reviewers: [
                        {username: p.ra.username, status: 'accepted'},
                        {username: p.rw.username, status: 'invited'},
                        {username: p.rd.username, status: 'declined'},
                    ],
                },
            ],
        });
        const openKey = reviewKey(open.reviewRounds[0]);

        // The Section Editor's list: the Reviewer who accepted, "Round 1 - Open".
        const ose = await panelAs(asUser, p.se.username, open.submissionId, 'review', {contextPath: openTag, menuKey: openKey});
        add = await ose.panel.openAdd();
        await expect(add.participantLabel(p.ra.username)).toContainText('Round 1 - Open');
        await expect(add.participantBox(p.rw.username)).toHaveCount(0);
        await expect(add.participantBox(p.rd.username)).toHaveCount(0);
        await add.cancelUntouched();

        // The Author's discussion with the Reviewer; the Reviewer's panel lists it.
        const oau = await authorPanelAs(asUser, p.au.username, open.submissionId, 'review', {contextPath: openTag, menuKey: openKey});
        add = await oau.panel.openAdd();
        await expect(add.participantLabel(p.ra.username)).toContainText('Round 1 - Open');
        await add.nameField().fill('About point 3');
        await add.typeMessage('Could you say more about point 3?');
        await add.tick(p.ra.username);
        await add.saveExpectClosed();
        await oau.panel.expectInGroup('About point 3', 'In progress');
        const raPage = await pageFor(asUser, p.ra.username);
        const raWizard = new ReviewWizardPage(raPage, openTag);
        await raWizard.goto(open.submissionId);
        await raWizard.expectStep(1);
        await raWizard.saveAndContinueButton.click();
        await raWizard.expectStep(2);
        await raWizard.continueToStep3Button.click();
        await raWizard.expectStep(3);
        const ra = new TasksDiscussionsPanel(raPage, openTag, {title: PANEL.review});
        await ra.expectSettled();
        await ra.expectInGroup('About point 3', 'In progress');

        // Control: the seeded press's Author was offered no Reviewer (above),
        // where the "Open" review's Author is offered one.
    });
});
