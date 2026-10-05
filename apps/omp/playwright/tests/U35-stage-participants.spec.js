// @ts-check
/**
 * @file playwright/tests/U35-stage-participants.spec.js
 *
 * Stage participants — OMP suite, one test per canonical scenario the spec
 * runs on a press, in the press's own words (Press Manager, Press editor,
 * Series editor, monograph, Internal and External Review): the five common
 * scenarios 3–7 and the journal-and-press scenarios 1, 2 and 8 with their
 * {OMP} bullets (scenario 9 is OPS-only).
 * Spec: docs/specs/U35-stage-participants.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A6 🐞: S1 reads the Series editor's discussion task row and asserts
 *   nothing about a task of "Assign Editor"'s own.
 * - A14 🐞: S1 and S5 read the Activity Log's event sentences, never the
 *   "User" column of the assignment and removal lines.
 * - A15 🐞: S1 reads the "Assign Editor" email's discussion footer and its
 *   unsubscribe link, never how many footers the email carries.
 * - OMP1 🐞: S1 reads the Internal Review entry not yet initiated (no
 *   panel), never its "Assign" window's predefined-message list.
 * - A1 🐞, A4 🐞, A7 🐞, A9 🐞, A11 🐞, A12 🐞, A16 🐞, A2 ❓,
 *   A8 ❓, A13 ❓: no scenario reaches them here.
 * - OJS1, OPS1, OPS2, OPS3: other apps' territory.
 *
 * S3 acts as the shared `manager.maya`, so it reads each "OK" by the
 * save's answer (`save-participant`), never by the notice, which any
 * concurrent session of that account can take (patterns.md parallel lesson
 * 2); the notice wording is asserted by the tests that act as throwaway
 * accounts: "User added as a stage participant." in S1 and S2, "Notification
 * sent to users." and the empty-"Notify" warning in S6. "The stage
 * assignment has been changed." is asserted by no test.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only (A1, A7). Every test seeds its own submission with a unique
 * tag (M5). S3 runs on the seeded press in series `monographs`, whose
 * submissions arrive with the series' editors assigned automatically
 * (`sectioneditor.ana` is edited and restored, `sectioneditor.omar` is the
 * control). Every other test runs on a scratch press with throwaway
 * accounts (footnote s), because each reads a mailbox (Mailpit is shared,
 * A8), needs a role the roster lacks, or changes a role's options. A person
 * a scenario assigns on screen is seeded in the press only (a seeded
 * participant leaves the "Assign" list). Two givens have no scenario key
 * and are set on the person's own Profile › Notifications tab, as footnote
 * s says: S6's unticked "Enable these types of notifications." on
 * "Discussion added." and S8's ticked "Do not send me an email…" on the
 * new-monograph row. A message is always sent with a predefined message
 * chosen: with the list left blank the send answers 500 on the Postgres
 * test database (scenarios.md "Decision behaviour worth knowing"). Every
 * absence is read with a settled locator (the exact row list, the exact
 * menu, a recipient-scoped mail read after a control) and paired with a
 * positive control taken the same way (M4, M6). Waits are web-first (A5).
 * Everything runs in the parallel `omp` project.
 */
const {test, expect} = require('../support/fixtures.js');
const {unordered} = require('../../../../shared/playwright/support/order.js');
const {TasksPanel, DISCUSSION_TASK} = require('../../../../shared/playwright/pages/NotificationsPages.js');
const {EditorialDashboardPage} = require('../../../../shared/playwright/pages/EditorialDashboardPage.js');
const {ProfilePage} = require('../../../../shared/playwright/pages/ProfilePage.js');
const {
    ParticipantsPanel,
    LeavePageDialogs,
    RoleOptionsForm,
    RemoveParticipantDialog,
    notice,
    NOTICES,
    BOX_LABELS,
    TEMPLATE_LABEL,
    UNSAVED_QUESTION,
    REMOVE_SENTENCE,
    RECOMMEND_ONLY_LINE,
} = require('../../../../shared/playwright/pages/StageParticipantsPages.js');
const {
    STEPS,
    startUrl,
    wizardUrl,
    expectWizardOpen,
    expectStep,
    fillStartTitle,
    continueTo,
    uploadWizardFile,
    openReview,
    problemsBanner,
    confirmSubmit,
    fillRichText,
} = require('../pages/SubmissionWizardPages.js');
const appContext = require('../support/app.context.js');

const PRESS = 'publicknowledge';

/** OMP's role names as the screens spell them. */
const ROLE = {
    editor: 'Press editor',
    sectionEditor: 'Series editor',
    productionEditor: 'Production editor',
    copyeditor: 'Copyeditor',
    author: 'Author',
};

/** The stage entries' menu keys and the Submission stage's discussions panel (OMP). */
const STAGE_KEY = {submission: 'workflow_1', copyediting: 'workflow_4'};
const DESK_DISCUSSIONS = 'Desk Review Tasks & Discussions';

/** The press's review entries (the workflow menu). */
const INTERNAL_REVIEW = 'Internal Review';
const EXTERNAL_REVIEW = 'External Review';
const INTERNAL_NOT_STARTED = 'The Internal Review stage has not yet been initiated.';

/** The "needs an editor" task sentence of a Press Manager's Tasks panel. */
const NEEDS_EDITOR_TASK = 'A new monograph has been submitted to which an editor needs to be assigned.';

/** The "Discussion added." row's setting and the new-monograph row's (Profile › Notifications). */
const DISCUSSION_SETTING = 'notificationNewQuery';
const SUBMITTED_SETTING = 'notificationSubmissionSubmitted';

/** The wizard's abstract box (TinyMCE control id, primary locale). */
const ABSTRACT_CONTROL = 'titleAbstract-abstract-control-en';

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u35${scenario}ompw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway or roster account's address (scenarios.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A mail body with its whitespace folded, for sentence matching. */
const flat = (text) => (text || '').replace(/\s+/g, ' ');

/**
 * A scratch press holding the given throwaway accounts, each
 * `{key: [givenName, familyName, roles]}`; returns them by key with
 * `username`, `name` (the full name) and `email`.
 */
async function seedPress(ompApi, tag, accounts, {contact = false} = {}) {
    const people = {};
    for (const [key, [givenName, familyName, roles]] of Object.entries(accounts)) {
        const username = `${key}${tag}`;
        people[key] = {username, givenName, familyName, roles, name: `${givenName} ${familyName}`, email: mailOf(username)};
    }
    const context = {name: `Press ${tag}`};
    if (contact) {
        Object.assign(context, {contactName: 'Jo Contact', contactEmail: `contact${tag}@mail.test`});
    }
    await ompApi.createContext({
        tag,
        context,
        users: Object.values(people).map(({username, givenName, familyName, roles}) => ({username, givenName, familyName, roles})),
    });
    return people;
}

/** A participants[] entry for a seeded account. */
const part = (person, role, extra = {}) => ({username: person.username, role, ...extra});

/**
 * Read the "Assign Participant" role list by permission level: `levels` in
 * order, the roles of one level in no fixed order (Rule 3; footnote d: the
 * options are ordered by role id alone, and several roles share one).
 */
async function expectRoleLevels(win, levels) {
    const options = await win.roleOptions();
    let at = 0;
    const shown = levels.map((level) => unordered(options.slice(at, (at += level.length))));
    expect({levels: shown, count: options.length}).toEqual({levels: levels.map(unordered), count: levels.flat().length});
}

/** Open a signed-in page for `person` (every actor goes through `asUser`, as U32 does). */
async function pageFor(asUser, username) {
    return (await asUser(username)).newPage();
}

/** The Participants panel of a press's workflow (review entry "External Review"). */
const panelOn = (page, contextPath) => new ParticipantsPanel(page, contextPath, {appContext});

/** The editorial dashboard of a press, its Tasks bell loaded. */
async function gotoEditorialDashboard(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/dashboard/editorial`);
    await expect(new TasksPanel(page).bell()).toBeVisible({timeout: 30_000});
}

/** Open the header's Tasks panel on a press and return it. */
async function openTasks(page, contextPath) {
    await gotoEditorialDashboard(page, contextPath);
    const tasks = new TasksPanel(page);
    await tasks.open();
    return tasks;
}

/** A person's Profile › Notifications box set and saved (the givens footnote s sets on screen). */
async function setNotificationBox(asUser, contextPath, username, settingName, box, checked) {
    const page = await pageFor(asUser, username);
    const profile = new ProfilePage(page, contextPath);
    await profile.goto('notifications');
    await profile.notificationPair(settingName)[box].setChecked(checked);
    await profile.save();
    const again = new ProfilePage(page, contextPath);
    await again.goto('notifications');
    await expect(again.notificationPair(settingName)[box]).toBeChecked({checked});
    await page.close();
}

/** Walk the wizard from its first step to "Submission complete" (the abstract filled when empty). */
async function finishWizard(page, fileName, abstract = null) {
    await expectStep(page, STEPS.files);
    await uploadWizardFile(page, fileName);
    await continueTo(page, STEPS.details);
    if (abstract) {
        await fillRichText(page, ABSTRACT_CONTROL, abstract);
    }
    await continueTo(page, STEPS.contributors);
    await continueTo(page, STEPS.editors);
    await openReview(page);
    await expect(problemsBanner(page)).toHaveCount(0);
    await confirmSubmit(page);
}

test.describe('stage participants', () => {
    test('S1: assign a Series editor with "Assign Editor"', {tag: '@smoke'}, async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(360_000);
        const tag = makeTag('s1', testInfo);
        const title = `Submission ${tag}`;
        const p = await seedPress(ompApi, tag, {
            ed: ['Erin', 'Editor', ['editor']],
            mgr: ['Mira', 'Manager', ['manager']],
            sa: ['Sam', 'Series', ['sectionEditor']],
            sb: ['Sue', 'Second', ['sectionEditor']],
            au: ['Ava', 'Author', ['author']],
        });
        const {submissionId} = await ompApi.createSubmission({tag, context: tag, submitter: p.au.username, title});

        // Control, before "OK": the Press Manager's Tasks panel lists the
        // needs-an-editor task and the "Needs editor" view lists the
        // submission.
        const mgrPage = await pageFor(asUser, p.mgr.username);
        let tasks = await openTasks(mgrPage, tag);
        await expect(tasks.row(NEEDS_EDITOR_TASK).filter({hasText: title})).toHaveCount(1);
        await tasks.close();
        const dash = new EditorialDashboardPage(mgrPage, tag);
        await dash.goto();
        await dash.openView('Needs editor');
        await dash.expectViewHeading('Needs editor', 1);
        await expect(dash.row(title)).toHaveCount(1);

        // The "Assign Participant" window: on the panel, which lists the
        // Author's row, press "Assign".
        const page = await pageFor(asUser, p.ed.username);
        const dialogs = new LeavePageDialogs(page);
        const panel = panelOn(page, tag);
        await panel.goto(submissionId, {menuKey: STAGE_KEY.submission});
        await panel.expectRows([ParticipantsPanel.lines(p.au, ROLE.author)]);
        let win = await panel.openAssign();
        await expect(win.title()).toHaveText('Assign Participant');
        await expect(win.locateHeading()).toBeVisible();
        await expectRoleLevels(win, [[ROLE.editor], [ROLE.sectionEditor], ['Funding coordinator'], [ROLE.author, 'Volume editor', 'Translator']]);
        expect(await win.selectedRole()).toBe(ROLE.editor);
        // It opens on the first role's people; neither box shows.
        await win.expectPeople([p.ed.name]);
        await expect(win.recommendOnlyBox()).toBeHidden();
        await expect(win.metadataBox()).toBeHidden();
        await expect(win.boxHeading('Assignment privileges')).toBeHidden();
        await expect(win.boxHeading('Permissions')).toBeHidden();

        // Another role: the people stay the previous role's until "Search".
        await win.chooseRole(ROLE.sectionEditor);
        await win.expectPeople([p.ed.name]);
        await win.search();
        await expect.poll(async () => (await win.peopleNames()).sort()).toEqual([p.sa.name, p.sb.name].sort());

        // The two boxes once a Series editor is chosen (the positive control
        // for their absence above).
        await win.choosePerson(p.sa.name);
        await expect(win.boxHeading('Assignment privileges')).toBeVisible();
        await expect(win.recommendOnlyBox()).toBeVisible();
        await expect(win.recommendOnlyBox()).not.toBeChecked();
        await expect(win.boxHeading('Permissions')).toBeVisible();
        await expect(win.metadataBox()).toBeVisible();
        await expect(win.metadataBox()).toBeChecked();
        await expect(win.root.getByText(BOX_LABELS.recommendOnly)).toBeVisible();
        await expect(win.root.getByText(BOX_LABELS.canChangeMetadata)).toBeVisible();

        // The predefined message: a blank entry, "Discussion (Submission)"
        // and "Assign Editor"; the letter fills "Message" with the "NAME" tag.
        await expect(win.root.getByText(TEMPLATE_LABEL, {exact: true})).toBeVisible();
        expect((await win.templateOptions()).sort()).toEqual(['', 'Discussion (Submission)', 'Assign Editor'].sort()); // the list has no fixed order (spec note f)
        await win.chooseTemplate('Assign Editor');
        const letter = flat(await win.messageText());
        expect(letter).toMatch(/^\s*Dear NAME,/);
        expect(letter).toContain('The following submission has been assigned to you to see through the editorial process.');

        // "OK": the notice, and the new row above the Author's.
        await win.ok();
        await expect(notice(page, NOTICES.added)).toBeVisible();
        await panel.expectRows([
            ParticipantsPanel.lines(p.sa, ROLE.sectionEditor),
            ParticipantsPanel.lines(p.au, ROLE.author),
        ]);

        // The other stages list the Series editor's row; the Internal Review
        // entry, not yet initiated, shows only its status box and no panel.
        await panel.reland();
        for (const stage of [EXTERNAL_REVIEW, 'Copyediting', 'Production']) {
            await panel.selectStage(stage);
            await expect(panel.row(p.sa.name, ROLE.sectionEditor)).toHaveCount(1);
        }
        await panel.frame.selectStage(INTERNAL_REVIEW);
        await panel.frame.expectStatus(INTERNAL_NOT_STARTED);
        await expect(panel.frame.secondaryColumn()).toHaveCount(0);
        await expect(panel.heading()).toHaveCount(0);

        // The Series editor's mailbox: "Assign Editor" from the Press editor,
        // the letter with their name, the discussion footer and its
        // unsubscribe link.
        const mail = await pkpMail.find({to: p.sa.email, subject: 'Assign Editor'});
        expect(mail.From.Address).toBe(p.ed.email);
        const full = await pkpMail.fullMessage(mail.ID);
        const body = flat(full.Text);
        expect(body).toContain(`Dear ${p.sa.name},`);
        expect(body).toContain('The following submission has been assigned to you to see through the editorial process.');
        expect(body).toContain('Reply to this comment at');
        expect(body).toMatch(/or unsubscribe .*from emails sent by/);
        expect(pkpMail.extractLink(full.HTML, 'unsubscribe')).toMatch(/\/notification\/unsubscribe\?/);

        // The discussion: listed on the Submission stage's panel; its
        // participants are the Series editor and the Press editor, its first
        // entry the letter.
        await panel.goto(submissionId, {menuKey: STAGE_KEY.submission});
        const discussionRows = panel.discussionRows(DESK_DISCUSSIONS, 'Assign Editor');
        await expect(discussionRows).toHaveCount(1);
        const discussion = await panel.openDiscussion(discussionRows, 'Assign Editor');
        await discussion.expectParticipants([p.sa.username, p.ed.username]);
        await expect(discussion.entries().first()).toContainText(
            'The following submission has been assigned to you to see through the editorial process.'
        );
        await discussion.close();

        // The Series editor's Tasks panel.
        const saPage = await pageFor(asUser, p.sa.username);
        tasks = await openTasks(saPage, tag);
        await expect(tasks.row(`${p.ed.name} started a discussion: Assign Editor`).filter({hasText: title})).toHaveCount(1);
        await tasks.close();

        // The Press Manager's Tasks panel and dashboard after "OK": the task
        // and the "Needs editor" entry are gone (the control above read
        // both, the same way).
        tasks = await openTasks(mgrPage, tag);
        await expect(tasks.grid()).toBeVisible();
        await expect(tasks.row(NEEDS_EDITOR_TASK).filter({hasText: title})).toHaveCount(0);
        await tasks.close();
        await dash.goto();
        await dash.openView('Needs editor');
        await dash.expectViewHeading('Needs editor', 0);
        await expect(dash.row(title)).toHaveCount(0);

        // The Activity Log.
        await panel.goto(submissionId, {menuKey: STAGE_KEY.submission});
        await panel.frame.openActivityLog();
        await expect(
            panel.frame.activityLogRow(`${p.sa.name} (${p.sa.username}) was assigned to this submission as a Series editor.`)
        ).toHaveCount(1);
        await expect(panel.frame.activityLogRow('Notification sent to users.').filter({hasText: p.ed.name})).toHaveCount(1);
        const emailRow = panel.frame.activityLogRow('An email has been sent: Assign Editor');
        await expect(emailRow).toHaveCount(1);
        await expect(await panel.revealViewEmailLink(emailRow)).toBeVisible();
        await panel.frame.closeActivityLog();

        // "Assign" again: the Series editor list offers the second one and
        // not the first.
        await panel.reland();
        win = await panel.openAssign();
        await win.chooseRole(ROLE.sectionEditor);
        await win.search();
        await win.expectPeople([p.sb.name]);

        // "Cancel": the window closes without a question.
        await win.choosePerson(p.sb.name);
        await win.cancel();
        expect(dialogs.count()).toBe(0);
        const oneSeriesEditorRow = async () =>
            expect
                .poll(async () => (await panel.rowLines()).filter((lines) => lines[2] === ROLE.sectionEditor).length)
                .toBe(1);
        await oneSeriesEditorRow();

        // The close control asks; its box's "Cancel" keeps the window, a
        // second press and "OK" close it.
        win = await panel.openAssign();
        dialogs.answerNext('dismiss');
        await win.closeControl().click();
        await expect.poll(() => dialogs.count()).toBe(1);
        expect(dialogs.last()).toMatchObject({type: 'confirm', message: UNSAVED_QUESTION});
        await expect(win.roleSelect()).toBeVisible();
        dialogs.answerNext('accept');
        await win.closeControl().click();
        await expect.poll(() => dialogs.count()).toBe(2);
        expect(dialogs.last()).toMatchObject({type: 'confirm', message: UNSAVED_QUESTION});
        await win.expectClosed();
        await oneSeriesEditorRow();

        // "Assign" and a reload: the browser's leave-page box; kept, the
        // window stays; answered to leave, the page reloads.
        win = await panel.openAssign();
        dialogs.answerNext('dismiss');
        await page.evaluate(() => window.location.reload()).catch(() => {});
        await expect.poll(() => dialogs.count()).toBe(3);
        expect(dialogs.last().type).toBe('beforeunload');
        await expect(win.roleSelect()).toBeVisible();
        dialogs.answerNext('accept');
        await page.reload();
        await expect.poll(() => dialogs.count()).toBe(4);
        expect(dialogs.last().type).toBe('beforeunload');
        await panel.frame.expectOpen(submissionId);
        await expect(panel.heading()).toBeVisible();
        await win.expectClosed();
        await oneSeriesEditorRow();
    });

    test('S2: a Series editor assigns a Copyeditor with "Request Copyedit"', async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s2', testInfo);
        const title = `Submission ${tag}`;
        const accounts = {
            se: ['Sam', 'Series', ['sectionEditor']],
            au: ['Ava', 'Author', ['author']],
        };
        for (let i = 1; i <= 21; i++) {
            accounts[`ce${String(i).padStart(2, '0')}`] = [`Cora${String(i).padStart(2, '0')}`, 'Copy', ['copyeditor']];
        }
        const p = await seedPress(ompApi, tag, accounts);
        const ce = p.ce01;
        // At Copyediting through an external round (the press's direct route
        // into External Review, then "Accept").
        const {submissionId} = await ompApi.createSubmission({
            tag,
            context: tag,
            submitter: p.au.username,
            title,
            decisions: ['skipInternalReview', 'accept'],
            participants: [part(p.se, 'sectionEditor')],
        });

        // The role list at Copyediting.
        const page = await pageFor(asUser, p.se.username);
        const panel = panelOn(page, tag);
        await panel.goto(submissionId, {menuKey: STAGE_KEY.copyediting});
        const win = await panel.openAssign();
        await expectRoleLevels(win, [
            [ROLE.editor, ROLE.productionEditor],
            [ROLE.sectionEditor],
            [ROLE.copyeditor, 'Marketing and sales coordinator'],
            [ROLE.author, 'Volume editor', 'Chapter Author', 'Translator'],
        ]);

        // "Copyeditor": the people stay as they were until "Search".
        const before = await win.peopleNames();
        await win.chooseRole(ROLE.copyeditor);
        await win.expectPeople(before);
        await win.search();
        await expect(win.people()).toHaveCount(20);
        await expect(win.itemsLine()).toHaveText(/^\s*20 of 21 items\s*$/);
        await expect(win.loadMoreLink()).toBeVisible();
        // Scrolling to the list's end loads nothing; "Load more" shows all.
        await win.people().last().scrollIntoViewIfNeeded();
        await page.mouse.wheel(0, 2000);
        await expect(win.people()).toHaveCount(20);
        await win.loadMoreLink().click();
        await expect(win.people()).toHaveCount(21);

        // The box: "Permissions" unticked, no "Assignment privileges".
        await win.choosePerson(ce.name);
        await expect(win.metadataBox()).toBeVisible();
        await expect(win.metadataBox()).not.toBeChecked();
        await expect(win.recommendOnlyBox()).toBeHidden();
        await expect(win.boxHeading('Assignment privileges')).toBeHidden();

        // "Request Copyedit": the letter with the "NAME" tag; "OK".
        expect((await win.templateOptions()).sort()).toEqual(['', 'Discussion (Copyediting)', 'Request Copyedit'].sort()); // the list has no fixed order (spec note f)
        await win.chooseTemplate('Request Copyedit');
        const letter = flat(await win.messageText());
        expect(letter).toMatch(/^\s*Dear NAME,/);
        expect(letter).toContain('A new submission is ready to be copyedited:');
        await win.ok();
        await expect(notice(page, NOTICES.added)).toBeVisible();
        await expect(panel.row(ce.name, ROLE.copyeditor)).toHaveCount(1);
        expect((await panel.rowLines()).find((lines) => lines[1] === ce.name)).toEqual(
            ParticipantsPanel.lines(ce, ROLE.copyeditor)
        );

        // The Production entry lists no Copyeditor row (the Series editor's
        // row there is the positive read).
        await panel.reland();
        await panel.selectStage('Production');
        await expect(panel.row(p.se.name, ROLE.sectionEditor)).toHaveCount(1);
        await expect(panel.row(ce.name)).toHaveCount(0);

        // The Copyeditor's mailbox.
        const mail = await pkpMail.find({to: ce.email, subject: 'Request Copyedit'});
        expect(mail.From.Address).toBe(p.se.email);
        const body = flat((await pkpMail.fullMessage(mail.ID)).Text);
        expect(body).toContain(`Dear ${ce.name},`);
        expect(body).toContain('A new submission is ready to be copyedited:');

        // The Copyeditor's screen: no "Assign", "Notify" alone in every row's
        // menu, and the discussion's task row.
        const cePage = await pageFor(asUser, ce.username);
        const cePanel = panelOn(cePage, tag);
        await cePanel.goto(submissionId, {menuKey: STAGE_KEY.copyediting});
        await cePanel.expectRows([
            ParticipantsPanel.lines(p.se, ROLE.sectionEditor),
            ParticipantsPanel.lines(ce, ROLE.copyeditor),
            ParticipantsPanel.lines(p.au, ROLE.author),
        ]);
        await expect(cePanel.assignButton()).toHaveCount(0);
        for (const person of [p.se, ce, p.au]) {
            await cePanel.expectMenu(person.name, ['Notify']);
        }
        const tasks = await openTasks(cePage, tag);
        await expect(
            tasks.row(`${p.se.name} started a discussion: Request Copyedit`).filter({hasText: title})
        ).toHaveCount(1);

        // Control: the Series editor's panel offers "Assign", and "Edit" and
        // "Remove" in the Copyeditor's row.
        await panel.goto(submissionId, {menuKey: STAGE_KEY.copyediting});
        await expect(panel.assignButton()).toBeVisible();
        await panel.expectMenu(ce.name, ['Edit', 'Notify', 'Remove']);
    });

    test('S3: change an assignment with "Edit"', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const {submissionId} = await ompApi.createSubmission({
            tag,
            context: PRESS,
            submitter: 'author.alex',
            title: `Submission ${tag}`,
            series: 'monographs',
        });
        const ana = {givenName: 'Ana', familyName: 'Section Editor', name: 'Ana Section Editor'};
        const omar = {givenName: 'Omar', familyName: 'Section Editor', name: 'Omar Section Editor'};

        const page = await pageFor(asUser, 'manager.maya');
        const panel = panelOn(page, PRESS);
        await panel.goto(submissionId, {menuKey: STAGE_KEY.submission});
        /**
         * "OK" on "Edit Assignment", read by the save's own answer instead of
         * the notice: S3 acts as the shared `manager.maya`, whose notices any
         * concurrent session of that account can take (patterns.md parallel
         * lesson 2).
         */
        const okSaved = async (editWindow) => {
            const saved = page.waitForResponse((r) => r.url().includes('save-participant'), {timeout: 30_000});
            await editWindow.ok();
            const response = await saved;
            expect(response.status()).toBe(200);
            expect((await response.json()).status).toBe(true);
        };
        /** A row's lines after the initials badge. */
        const linesOf = async (person) =>
            ((await panel.rowLines()).find((lines) => lines[1] === person.name) || []).slice(1);
        const plain = (person) => [person.name, ROLE.sectionEditor];
        const limited = (person) => [person.name, ROLE.sectionEditor, RECOMMEND_ONLY_LINE];
        await expect.poll(() => linesOf(ana)).toEqual(plain(ana));
        await expect.poll(() => linesOf(omar)).toEqual(plain(omar));

        // "Edit Assignment": the participant in bold with the role, the boxes
        // as the assignment stands, and no message box.
        let win = await panel.openEdit(ana.name, ROLE.sectionEditor);
        await expect(win.title()).toHaveText('Edit Assignment');
        await expect(win.form()).toContainText('Participant');
        await expect(win.form()).toContainText(`${ana.name} (${ROLE.sectionEditor})`);
        await expect(win.boldName(ana.name)).toBeVisible();
        await expect(win.recommendOnlyBox()).not.toBeChecked();
        await expect(win.metadataBox()).toBeChecked();
        await expect(win.messageFields()).toHaveCount(0);

        // Both boxes changed: the notice and the third line.
        await win.recommendOnlyBox().check();
        await win.metadataBox().uncheck();
        await okSaved(win);
        await expect.poll(() => linesOf(ana)).toEqual(limited(ana));
        await expect.poll(() => linesOf(omar)).toEqual(plain(omar));

        // "Edit" again: the boxes as saved; "Cancel" closes.
        await panel.reland();
        win = await panel.openEdit(ana.name, ROLE.sectionEditor);
        await expect(win.recommendOnlyBox()).toBeChecked();
        await expect(win.metadataBox()).not.toBeChecked();
        await win.cancel();

        // Another stage: the Production entry's row reads the limit too.
        await panel.reland();
        await panel.selectStage('Production');
        await expect.poll(() => linesOf(ana)).toEqual(limited(ana));
        await expect.poll(() => linesOf(omar)).toEqual(plain(omar));

        // Back to the start: the notice, and the third line gone.
        await panel.goto(submissionId, {menuKey: STAGE_KEY.submission});
        win = await panel.openEdit(ana.name, ROLE.sectionEditor);
        await win.recommendOnlyBox().uncheck();
        await win.metadataBox().check();
        await okSaved(win);
        await expect.poll(() => linesOf(ana)).toEqual(plain(ana));

        // Control: the second Series editor's row never changed.
        await expect.poll(() => linesOf(omar)).toEqual(plain(omar));
    });

    test('S4: what an assigned editor may change on the panel', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s4', testInfo);
        const p = await seedPress(ompApi, tag, {
            sa: ['Sam', 'Series', ['sectionEditor']],
            sb: ['Sue', 'Second', ['sectionEditor']],
            ed: ['Erin', 'Editor', ['editor']],
            pe: ['Pat', 'Production', ['productionEditor']],
            mgr: ['Mira', 'Manager', ['manager']],
            au: ['Ava', 'Author', ['author']],
        });
        const {submissionId} = await ompApi.createSubmission({
            tag,
            context: tag,
            submitter: p.au.username,
            title: `Submission ${tag}`,
            decisions: ['skipExternalReview'],
            participants: [
                part(p.sa, 'sectionEditor'),
                part(p.sb, 'sectionEditor', {recommendOnly: true}),
                part(p.ed, 'editor', {recommendOnly: true}),
            ],
        });
        const everyone = [p.ed, p.sa, p.sb, p.au];

        // The deciding Series editor.
        const saPage = await pageFor(asUser, p.sa.username);
        const saDialogs = new LeavePageDialogs(saPage);
        const sa = panelOn(saPage, tag);
        await sa.goto(submissionId);
        await expect(sa.assignButton()).toBeVisible();
        await sa.expectMenu(p.sa.name, ['Notify', 'Remove']);
        await sa.expectMenu(p.ed.name, ['Notify', 'Remove']);
        let win = await sa.openEdit(p.sb.name);
        await expect(win.recommendOnlyBox()).toBeChecked();
        await expect(win.metadataBox()).toBeChecked();
        await win.cancel();
        expect(saDialogs.count()).toBe(0);

        // The recommending Series editor.
        const sbPage = await pageFor(asUser, p.sb.username);
        const sb = panelOn(sbPage, tag);
        await sb.goto(submissionId);
        await expect(sb.assignButton()).toBeVisible();
        await sb.expectMenu(p.sa.name, ['Notify', 'Remove']);
        win = await sb.openEdit(p.au.name);
        await expect(win.metadataBox()).toBeVisible();
        await expect(win.recommendOnlyBox()).toHaveCount(0);
        await win.cancel();

        // The recommending Press editor.
        const edPage = await pageFor(asUser, p.ed.username);
        const ed = panelOn(edPage, tag);
        await ed.goto(submissionId);
        win = await ed.openEdit(p.sa.name);
        await expect(win.metadataBox()).toBeVisible();
        await expect(win.recommendOnlyBox()).toHaveCount(0);
        await win.cancel();

        // The Production editor, not assigned: "Assign" and "Edit" on every
        // row, the Press editor's included, and the same panel on the other
        // stages.
        const pePage = await pageFor(asUser, p.pe.username);
        const pe = panelOn(pePage, tag);
        await pe.goto(submissionId);
        await expect(pe.assignButton()).toBeVisible();
        await expect
            .poll(async () => (await pe.rowLines()).map((lines) => lines[1]).sort())
            .toEqual(everyone.map((person) => person.name).sort());
        const panelRows = await pe.rowLines();
        for (const person of everyone) {
            await pe.openMenu(person.name);
            await expect(pe.menuItem('Edit')).toBeVisible();
            await pe.closeMenu(person.name);
        }
        for (const stage of [EXTERNAL_REVIEW, 'Copyediting', 'Production']) {
            await pe.selectStage(stage);
            await expect(pe.assignButton()).toBeVisible();
            await pe.expectRows(panelRows);
        }

        // Control: the Press Manager, not assigned, is offered "Edit" on the
        // two rows where the deciding Series editor had none.
        const mgrPage = await pageFor(asUser, p.mgr.username);
        const mgr = panelOn(mgrPage, tag);
        await mgr.goto(submissionId);
        for (const person of [p.sa, p.ed]) {
            await mgr.openMenu(person.name);
            await expect(mgr.menuItem('Edit')).toBeVisible();
            await mgr.closeMenu(person.name);
        }
    });

    test('S5: remove a participant', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s5', testInfo);
        const title = `Submission ${tag}`;
        const p = await seedPress(ompApi, tag, {
            mgr: ['Mira', 'Manager', ['manager']],
            du: ['Dana', 'Dual', ['sectionEditor', 'copyeditor']],
            au: ['Ava', 'Author', ['author']],
        });
        const {submissionId} = await ompApi.createSubmission({
            tag,
            context: tag,
            submitter: p.au.username,
            title,
            participants: [part(p.du, 'sectionEditor'), part(p.du, 'copyeditor')],
        });

        // The given: the Press Manager opens a discussion with the Series
        // editor through their row's "Notify" (footnote s).
        const page = await pageFor(asUser, p.mgr.username);
        const panel = panelOn(page, tag);
        await panel.goto(submissionId, {menuKey: STAGE_KEY.submission});
        const notify = await panel.openNotify(p.du.name, ROLE.sectionEditor);
        await notify.chooseTemplate('Discussion (Submission)');
        await notify.send();

        // Control, before "OK": the "Needs editor" view does not list the
        // submission, and the discussion names the Series editor.
        const dash = new EditorialDashboardPage(page, tag);
        await dash.goto();
        await dash.openView('Needs editor');
        await dash.expectViewHeading('Needs editor', 0);
        await expect(dash.row(title)).toHaveCount(0);
        await panel.goto(submissionId, {menuKey: STAGE_KEY.submission});
        let discussion = await panel.openDiscussion(
            panel.discussionRows(DESK_DISCUSSIONS, 'Discussion (Submission)'),
            'Discussion (Submission)'
        );
        await discussion.expectParticipants([p.mgr.username, p.du.username]);
        await discussion.close();

        // The dialog: "Remove" in red, the question, "OK" in red and
        // "Cancel"; "Cancel" keeps the row.
        await panel.reland();
        await panel.openMenu(p.du.name, ROLE.sectionEditor);
        await expect(panel.menuItem('Remove')).toHaveClass(/text-negative/);
        await panel.menuItem('Remove').click();
        let dialog = new RemoveParticipantDialog(page);
        await dialog.expectOpen();
        await expect(dialog.title()).toBeVisible();
        await expect(dialog.root).toContainText(REMOVE_SENTENCE);
        await expect(dialog.okButton()).toHaveClass(/text-negative/);
        await expect(dialog.cancelButton()).toBeVisible();
        await dialog.cancel();
        await expect(panel.row(p.du.name, ROLE.sectionEditor)).toHaveCount(1);

        // "OK": the Series editor row is gone (the Author's stays).
        dialog = await panel.openRemove(p.du.name, ROLE.sectionEditor);
        await dialog.ok();
        await expect(panel.row(p.du.name, ROLE.sectionEditor)).toHaveCount(0);
        await expect(panel.row(p.au.name, ROLE.author)).toHaveCount(1);

        // The other stages: no Series editor row for the person; Copyediting
        // still lists their Copyeditor row.
        await panel.reland();
        for (const stage of [EXTERNAL_REVIEW, 'Copyediting', 'Production']) {
            await panel.selectStage(stage);
            await expect(panel.row(p.au.name, ROLE.author)).toHaveCount(1);
            await expect(panel.row(p.du.name, ROLE.sectionEditor)).toHaveCount(0);
        }
        await panel.selectStage('Copyediting');
        await expect(panel.row(p.du.name, ROLE.copyeditor)).toHaveCount(1);

        // The discussion no longer names the Series editor.
        await panel.goto(submissionId, {menuKey: STAGE_KEY.submission});
        discussion = await panel.openDiscussion(
            panel.discussionRows(DESK_DISCUSSIONS, 'Discussion (Submission)'),
            'Discussion (Submission)'
        );
        await discussion.expectParticipants([p.mgr.username]);
        await discussion.close();

        // The Activity Log.
        await panel.reland();
        await panel.frame.openActivityLog();
        await expect(
            panel.frame.activityLogRow(`${p.du.name} (${p.du.username}) was removed from this submission as a Series editor.`)
        ).toHaveCount(1);
        await panel.frame.closeActivityLog();

        // The dashboard: "Needs editor" lists the submission again, with
        // "Assign Editor".
        await dash.goto();
        await dash.openView('Needs editor');
        await dash.expectViewHeading('Needs editor', 1);
        await expect(dash.row(title)).toHaveCount(1);
        await expect(dash.assignEditorButton(dash.row(title))).toBeVisible();
    });

    test('S6: notify a participant', async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s6', testInfo);
        const title = `Submission ${tag}`;
        const message = 'Please check the reference list.';
        const p = await seedPress(ompApi, tag, {
            mgr: ['Mira', 'Manager', ['manager']],
            sa: ['Sam', 'Series', ['sectionEditor']],
            sb: ['Sue', 'Second', ['sectionEditor']],
            au: ['Ava', 'Author', ['author']],
        });
        const {submissionId} = await ompApi.createSubmission({
            tag,
            context: tag,
            submitter: p.au.username,
            title,
            participants: [part(p.sa, 'sectionEditor'), part(p.sb, 'sectionEditor')],
        });
        // The given: the second Series editor unticked "Enable these types of
        // notifications." on "Discussion added." (no scenario key; footnote s).
        await setNotificationBox(asUser, tag, p.sb.username, DISCUSSION_SETTING, 'allow', false);

        // The "Notify" window.
        const page = await pageFor(asUser, p.mgr.username);
        const panel = panelOn(page, tag);
        await panel.goto(submissionId, {menuKey: STAGE_KEY.submission});
        const win = await panel.openNotify(p.sa.name);
        await expect(win.title()).toHaveText('Notify');
        await expect(win.startDiscussionHeading()).toBeVisible();
        await expect(win.sentence(p.sa.name)).toBeVisible();
        await expect(win.templateLabel()).toBeVisible();
        await expect(win.root.getByText(/^\s*Message\*?\s*$/)).toBeVisible();
        await expect(win.notifyButton()).toBeVisible();
        await expect(win.cancelControls()).toHaveCount(0);

        // "Message" empty: the window stays, with the warning.
        await win.notifyButton().click();
        await expect(notice(page, NOTICES.notifyRefused)).toBeVisible();
        await expect(win.notifyButton()).toBeVisible();

        // A predefined message, replaced by the Press Manager's text.
        await win.chooseTemplate('Discussion (Submission)');
        expect(flat(await win.messageText()).trim()).toBe('Please enter your message.');
        await win.typeMessage(message);
        await win.send();
        await expect(notice(page, NOTICES.notified)).toBeVisible();

        // The first Series editor's mailbox.
        const mail = await pkpMail.find({to: p.sa.email, subject: 'Discussion (Submission)'});
        expect(mail.From.Address).toBe(p.mgr.email);
        const full = await pkpMail.fullMessage(mail.ID);
        const body = flat(full.Text);
        expect(body.trim().startsWith(message)).toBe(true);
        expect(body).toContain('Reply to this comment at');
        expect(pkpMail.extractLink(full.HTML, 'unsubscribe')).toMatch(/\/notification\/unsubscribe\?/);

        // The discussion: one "Discussion (Submission)" (the empty "Notify"
        // added none), its participants and first entry.
        await panel.reland();
        const rows = panel.discussionRows(DESK_DISCUSSIONS, 'Discussion (Submission)');
        await expect(rows).toHaveCount(1);
        const discussion = await panel.openDiscussion(rows, 'Discussion (Submission)');
        await discussion.expectParticipants([p.sa.username, p.mgr.username]);
        await expect(discussion.entries().first()).toContainText(message);
        await discussion.close();

        // The first Series editor's Tasks panel.
        const task = DISCUSSION_TASK({creatorName: p.mgr.name, name: 'Discussion (Submission)', message});
        const saPage = await pageFor(asUser, p.sa.username);
        const saTasks = await openTasks(saPage, tag);
        await expect(saTasks.row(task).filter({hasText: title})).toHaveCount(1);

        // The Activity Log.
        await panel.reland();
        await panel.frame.openActivityLog();
        await expect(panel.frame.activityLogRow('Notification sent to users.').filter({hasText: p.mgr.name})).toHaveCount(1);
        const emailRow = panel.frame.activityLogRow('An email has been sent: Discussion (Submission)');
        await expect(emailRow).toHaveCount(1);
        await expect(await panel.revealViewEmailLink(emailRow)).toBeVisible();
        await panel.frame.closeActivityLog();

        // "Notify" to the second Series editor: sent, a second discussion.
        await panel.reland();
        const second = await panel.openNotify(p.sb.name);
        await second.chooseTemplate('Discussion (Submission)');
        await second.typeMessage(message);
        await second.send();
        await expect(notice(page, NOTICES.notified)).toBeVisible();
        await panel.reland();
        await expect(panel.discussionRows(DESK_DISCUSSIONS, 'Discussion (Submission)')).toHaveCount(2);

        // The second Series editor's mailbox and Tasks panel stay empty of
        // it; control: the first one's email, sent the same way, arrived.
        await pkpMail.expectNone({
            to: p.sb.email,
            subject: 'Discussion (Submission)',
            afterControl: {to: p.sa.email, subject: 'Discussion (Submission)'},
        });
        const sbPage = await pageFor(asUser, p.sb.username);
        const sbTasks = await openTasks(sbPage, tag);
        await expect(sbTasks.grid()).toBeVisible();
        await expect(sbTasks.rows().filter({hasText: title})).toHaveCount(0);
    });

    test("S7: a role's options: recommend only, and no metadata permission", async ({asUser, ompApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s7', testInfo);
        const p = await seedPress(ompApi, tag, {
            mgr: ['Mira', 'Manager', ['manager']],
            sa: ['Sam', 'Series', ['sectionEditor']],
            sb: ['Sue', 'Second', ['sectionEditor']],
            sc: ['Tia', 'Third', ['sectionEditor']],
            ed: ['Erin', 'Editor', ['editor']],
            au: ['Ava', 'Author', ['author']],
        });
        const first = await ompApi.createSubmission({
            tag,
            context: tag,
            submitter: p.au.username,
            title: `First ${tag}`,
            participants: [part(p.sa, 'sectionEditor')],
        });
        const second = await ompApi.createSubmission({
            tag: `${tag}b`,
            context: tag,
            submitter: p.au.username,
            title: `Second ${tag}`,
            participants: [part(p.sb, 'sectionEditor')],
        });

        // An assignment before the change.
        const page = await pageFor(asUser, p.mgr.username);
        const panel = panelOn(page, tag);
        await panel.goto(first.submissionId, {menuKey: STAGE_KEY.submission});
        let win = await panel.openEdit(p.sa.name);
        await expect(win.recommendOnlyBox()).not.toBeChecked();
        await expect(win.metadataBox()).toBeChecked();
        await win.cancel();

        // The Role Options of the Series editor role.
        const roles = new RoleOptionsForm(page, tag);
        await roles.gotoRoles();
        await roles.openRole(ROLE.sectionEditor);
        await expect(roles.roleOptionsHeading()).toBeVisible();
        await roles.recommendOnlyBox().check();
        await roles.permitMetadataEditBox().uncheck();
        await roles.save();

        // The existing assignments: the permission withdrawn, the limit not
        // set, no third line.
        for (const [submission, person] of [
            [first, p.sa],
            [second, p.sb],
        ]) {
            await panel.goto(submission.submissionId, {menuKey: STAGE_KEY.submission});
            win = await panel.openEdit(person.name);
            await expect(win.metadataBox()).not.toBeChecked();
            await expect(win.recommendOnlyBox()).not.toBeChecked();
            await win.cancel();
            await expect.poll(async () =>
                (await panel.rowLines()).find((lines) => lines[1] === person.name)
            ).toEqual(ParticipantsPanel.lines(person, ROLE.sectionEditor));
        }

        // A new assignment starts from the role's options.
        await panel.goto(first.submissionId, {menuKey: STAGE_KEY.submission});
        let assign = await panel.openAssign();
        await assign.chooseRole(ROLE.sectionEditor);
        await assign.search();
        await assign.choosePerson(p.sc.name);
        await expect(assign.recommendOnlyBox()).toBeVisible();
        await expect(assign.recommendOnlyBox()).toBeChecked();
        await expect(assign.metadataBox()).toBeVisible();
        await expect(assign.metadataBox()).not.toBeChecked();
        await assign.ok();
        await expect
            .poll(async () => (await panel.rowLines()).find((lines) => lines[1] === p.sc.name))
            .toEqual(ParticipantsPanel.lines(p.sc, ROLE.sectionEditor, {recommendOnly: true}));

        // Control: the Press editor role, left as it was.
        await panel.reland();
        assign = await panel.openAssign();
        expect(await assign.selectedRole()).toBe(ROLE.editor);
        await assign.choosePerson(p.ed.name);
        await expect(assign.recommendOnlyBox()).toBeVisible();
        await expect(assign.recommendOnlyBox()).not.toBeChecked();
        await expect(assign.metadataBox()).toBeHidden();
        await expect(assign.boxHeading('Permissions')).toBeHidden();
        await assign.cancel();
    });

    test('S8: the automatic "Editor Assigned (Auto)" email', async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(420_000);
        const tag = makeTag('s8', testInfo);
        const title = `Submission ${tag}`;
        const ownTitle = `Own ${tag}`;
        const pressName = `Press ${tag}`;
        const subject = `You have been assigned as an editor on a submission to ${pressName}`;
        const p = await seedPress(
            ompApi,
            tag,
            {
                au: ['Ava', 'Author', ['author']],
                ed: ['Erin', 'Editor', ['editor']],
                sa: ['Sam', 'Series', ['sectionEditor']],
                op: ['Otto', 'Optout', ['sectionEditor']],
                du: ['Dana', 'Dual', ['editor', 'sectionEditor']],
                pe: ['Pat', 'Production', ['productionEditor']],
                fc: ['Fay', 'Funding', ['funding']],
                e2: ['Edna', 'Submitter', ['editor', 'author']],
            },
            {contact: true}
        );
        // The given: the second Series editor ticked "Do not send me an
        // email…" on the new-monograph row (no scenario key; footnote s).
        await setNotificationBox(asUser, tag, p.op.username, SUBMITTED_SETTING, 'email', true);
        const {submissionId} = await ompApi.createSubmission({
            tag,
            context: tag,
            submitter: p.au.username,
            title,
            submitted: false,
            participants: [
                part(p.ed, 'editor'),
                part(p.sa, 'sectionEditor'),
                part(p.op, 'sectionEditor'),
                part(p.du, 'editor'),
                part(p.du, 'sectionEditor'),
                part(p.pe, 'productionEditor'),
                part(p.fc, 'funding'),
            ],
        });

        // "Submit": the Author finishes the draft in the wizard.
        const authorPage = await pageFor(asUser, p.au.username);
        await authorPage.goto(wizardUrl(tag, submissionId));
        await expectWizardOpen(authorPage);
        await finishWizard(authorPage, `u35s8${tag}.txt`);

        // The editors' mailboxes: one email each, from the press's contact,
        // with the link, title, author and abstract, asking to send the
        // submission for review or decline it.
        let link = null;
        for (const person of [p.ed, p.sa, p.du]) {
            const mail = await pkpMail.find({to: person.email, subject});
            expect(await pkpMail.count({to: person.email, subject})).toBe(1);
            expect(mail.From.Address).toBe(`contact${tag}@mail.test`);
            expect(mail.From.Name).toBe('Jo Contact');
            const full = await pkpMail.fullMessage(mail.ID);
            const body = flat(full.Text);
            expect(body).toContain(title);
            expect(body).toContain(p.au.name);
            expect(body).toContain('Abstract');
            expect(body).toContain(`Seeded abstract for ${tag}.`);
            expect(body).toContain('please forward the submission to the review stage');
            expect(body).toContain('please decline the submission');
            const href = pkpMail.extractLink(full.HTML, title);
            expect(href).toContain(`workflowSubmissionId=${submissionId}`);
            if (person === p.ed) {
                link = href;
            }
        }

        // The link: the Press editor lands on the submission's workflow.
        const edPage = await pageFor(asUser, p.ed.username);
        const panel = panelOn(edPage, tag);
        await edPage.goto(new URL(link).pathname + new URL(link).search);
        await panel.frame.expectOpen(submissionId);

        // The Activity Log: one line per person emailed.
        await panel.frame.openActivityLog();
        await expect(panel.frame.activityLogRow(`An email has been sent: ${subject}`)).toHaveCount(3);
        await panel.frame.closeActivityLog();

        // An editor's own submission, sent as "Press editor".
        const e2Page = await pageFor(asUser, p.e2.username);
        await e2Page.goto(startUrl(tag));
        await expect(e2Page.getByRole('heading', {name: /Make a Submission/}).first()).toBeVisible({timeout: 30_000});
        await fillStartTitle(e2Page, ownTitle);
        await e2Page.getByRole('radio', {name: ROLE.editor, exact: true}).check();
        for (const box of [
            e2Page.getByRole('checkbox', {name: /meets all of these requirements/}),
            e2Page.getByRole('checkbox', {name: /agree to have my data collected/}),
        ]) {
            if (await box.count()) {
                await box.check();
            }
        }
        await e2Page.getByRole('button', {name: 'Begin Submission'}).click();
        await e2Page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 30_000});
        await expectWizardOpen(e2Page);
        await finishWizard(e2Page, `u35s8own${tag}.txt`, `Abstract of ${ownTitle}.`);
        await pkpMail.find({to: p.e2.email, subject, contains: ownTitle});

        // Control: no such email to the opted-out Series editor, the
        // Production editor or the Funding coordinator, while the first
        // Series editor's arrived from the same "Submit".
        for (const person of [p.op, p.pe, p.fc]) {
            await pkpMail.expectNone({to: person.email, subject, afterControl: {to: p.sa.email, subject}});
        }
    });
});
