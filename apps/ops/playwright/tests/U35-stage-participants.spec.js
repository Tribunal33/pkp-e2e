// @ts-check
/**
 * @file playwright/tests/U35-stage-participants.spec.js
 *
 * Stage participants — OPS suite, one test per canonical scenario the spec
 * runs on a preprint server, in the server's own words (Preprint Server
 * manager, Moderator, preprint, the single Production entry): the five
 * common scenarios 3–7 with their preprint-server variants, and the
 * server's own scenario 9 ("Assign a Moderator"). Scenarios 1, 2 and 8 are
 * badged {OJS OMP}: scenario 9 is scenario 1's analogue, a preprint server
 * has no Copyediting stage and no Copyeditor (scenario 2), and scenario 8's
 * automatic email is never sent here, which is register OPS3 🐞 and so is
 * never asserted (M3). The bullets a common scenario badges {OJS OMP} (the
 * other stages, the Production editor, the "Needs editor" view) have no
 * surface on a preprint server and are not run.
 * Spec: docs/specs/U35-stage-participants.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A14 🐞: S5 and S9 read the Activity Log's event sentences, never the
 *   "User" column of the assignment and removal lines.
 * - OPS2 🐞: S9 reads "Assign Editor" in the predefined-message list and
 *   never chooses it.
 * - OPS3 🐞: scenario 8 has no run here (see above).
 * - A1 🐞, A3 🐞, A4 🐞, A6 🐞, A7 🐞, A9 🐞, A11 🐞, A12 🐞, A15 🐞,
 *   A16 🐞, A2 ❓, A8 ❓, A13 ❓: no scenario reaches them here.
 * - OPS1 ✅: S9 reads the manager role offered in "Assign" as the spec's
 *   text. OJS1, OMP1, OMP2: other apps' territory.
 * - T-ops-1 (returned to the fold, not yet in the register): a participant
 *   notice may land in the Production entry's own "Notification" box
 *   instead of the top-right toast; S6 and S9 accept either place
 *   (`participantNotice`) and assert neither as the contract.
 *
 * S3 acts as the shared `manager.maya`, so it reads each "OK" by the
 * save's answer (`save-participant`), never by the notice, which any
 * concurrent session of that account can take (patterns.md parallel lesson
 * 2); the notice wording is asserted by the tests that act as throwaway
 * accounts: "User added as a stage participant." in S9, "Notification
 * sent to users." and the empty-"Notify" warning in S6. "The stage
 * assignment has been changed." is asserted by no test.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only (A1, A7). Every test seeds its own submission with a unique
 * tag (M5). S3 runs on the seeded server, whose preprints in section `PRE`
 * arrive with the section's Moderators assigned automatically
 * (`sectioneditor.ana` is edited and restored, `sectioneditor.ravi` is the
 * control). Every other test runs on a scratch server with throwaway
 * accounts (footnote s), because each reads a mailbox (Mailpit is shared,
 * A8), needs a second manager the roster lacks, or changes a role's
 * options. A person a scenario assigns on screen is seeded in the server
 * only (a seeded participant leaves the "Assign" list). S6's given (the
 * second Moderator's unticked "Enable these types of notifications." on
 * "Discussion added.") has no scenario key and is set on that person's own
 * Profile › Notifications tab, as footnote s says. A message is always sent
 * with a predefined message chosen: with the list left blank the send
 * answers 500 on the Postgres test database (scenarios.md "Decision
 * behaviour worth knowing"). Every absence is read with a settled locator
 * (the exact row list, the exact menu, a recipient-scoped mail read after
 * a control) and paired with a positive control taken the same way (M4,
 * M6). Waits are web-first (A5). Everything runs in the parallel `ops`
 * project.
 */
const {test, expect} = require('../support/fixtures.js');
const {TasksPanel, DISCUSSION_TASK} = require('../../../../shared/playwright/pages/NotificationsPages.js');
const {ProfilePage} = require('../../../../shared/playwright/pages/ProfilePage.js');
const {
    ParticipantsPanel,
    RoleOptionsForm,
    RemoveParticipantDialog,
    notice,
    stageNotice,
    NOTICES,
    BOX_LABELS,
    TEMPLATE_LABEL,
    REMOVE_SENTENCE,
    RECOMMEND_ONLY_LINE,
    LeavePageDialogs,
} = require('../../../../shared/playwright/pages/StageParticipantsPages.js');
const appContext = require('../support/app.context.js');

const SERVER = 'publicknowledge';

/** OPS's role names as the screens spell them. */
const ROLE = {
    manager: 'Preprint Server manager',
    moderator: 'Moderator',
    author: 'Author',
};

/** The one stage entry's menu key and its discussions panel (OPS). */
const PRODUCTION = 'workflow_5';
const DISCUSSIONS = 'Production Tasks & Discussions';

/** The stage's predefined message a scenario sends (Rule 5a, OPS column). */
const DISCUSSION = 'Discussion (Production)';

/** The "Discussion added." row's setting (Profile › Notifications). */
const DISCUSSION_SETTING = 'notificationNewQuery';

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u35${scenario}opsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway or roster account's address (scenarios.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A mail body with its whitespace folded, for sentence matching. */
const flat = (text) => (text || '').replace(/\s+/g, ' ');

/**
 * A scratch preprint server holding the given throwaway accounts, each
 * `{key: [givenName, familyName, roles]}`; returns them by key with
 * `username`, `name` (the full name) and `email`.
 */
async function seedServer(opsApi, tag, accounts) {
    const people = {};
    for (const [key, [givenName, familyName, roles]] of Object.entries(accounts)) {
        const username = `${key}${tag}`;
        people[key] = {username, givenName, familyName, roles, name: `${givenName} ${familyName}`, email: mailOf(username)};
    }
    await opsApi.createContext({
        tag,
        context: {name: `Server ${tag}`},
        users: Object.values(people).map(({username, givenName, familyName, roles}) => ({username, givenName, familyName, roles})),
    });
    return people;
}

/** A participants[] entry for a seeded account. */
const part = (person, role, extra = {}) => ({username: person.username, role, ...extra});

/**
 * A participant notice as a preprint server shows it: the toast at the top
 * right, or, when the Production entry's own notification box drained it
 * first, that box headed "Notification" (an app race, T-ops-1; worked
 * around, never asserted as the contract).
 */
const participantNotice = (page, text) => notice(page, text).or(stageNotice(page, text)).first();

/** Open a signed-in page for `person` (every actor goes through `asUser`). */
async function pageFor(asUser, username) {
    return (await asUser(username)).newPage();
}

/** The Participants panel of a preprint server's workflow. */
const panelOn = (page, contextPath) => new ParticipantsPanel(page, contextPath, {appContext});

/** Open the header's Tasks panel on a server's editorial dashboard and return it. */
async function openTasks(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/dashboard/editorial`);
    const tasks = new TasksPanel(page);
    await expect(tasks.bell()).toBeVisible({timeout: 30_000});
    await tasks.open();
    return tasks;
}

/** A person's Profile › Notifications box set and saved (the given footnote s sets on screen). */
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

test.describe('stage participants', () => {
    test('S3: change an assignment with "Edit"', async ({asUser, opsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const {submissionId} = await opsApi.createSubmission({
            tag,
            context: SERVER,
            submitter: 'author.alex',
            title: `Preprint ${tag}`,
        });
        const ana = {givenName: 'Ana', familyName: 'Section Editor', name: 'Ana Section Editor'};
        const ravi = {givenName: 'Ravi', familyName: 'Section Editor', name: 'Ravi Section Editor'};

        const page = await pageFor(asUser, 'manager.maya');
        const panel = panelOn(page, SERVER);
        await panel.goto(submissionId, {menuKey: PRODUCTION});
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
        const plain = (person) => [person.name, ROLE.moderator];
        const limited = (person) => [person.name, ROLE.moderator, RECOMMEND_ONLY_LINE];
        await expect.poll(() => linesOf(ana)).toEqual(plain(ana));
        await expect.poll(() => linesOf(ravi)).toEqual(plain(ravi));

        // "Edit Assignment": the participant in bold with the role, the boxes
        // as the assignment stands, and no message box.
        let win = await panel.openEdit(ana.name, ROLE.moderator);
        await expect(win.title()).toHaveText('Edit Assignment');
        await expect(win.form()).toContainText('Participant');
        await expect(win.form()).toContainText(`${ana.name} (${ROLE.moderator})`);
        await expect(win.boldName(ana.name)).toBeVisible();
        await expect(win.recommendOnlyBox()).not.toBeChecked();
        await expect(win.metadataBox()).toBeChecked();
        await expect(win.messageFields()).toHaveCount(0);

        // Both boxes changed: the notice and the third line.
        await win.recommendOnlyBox().check();
        await win.metadataBox().uncheck();
        await okSaved(win);
        await expect.poll(() => linesOf(ana)).toEqual(limited(ana));
        await expect.poll(() => linesOf(ravi)).toEqual(plain(ravi));

        // "Edit" again: the boxes as saved; "Cancel" closes.
        await panel.reland();
        win = await panel.openEdit(ana.name, ROLE.moderator);
        await expect(win.recommendOnlyBox()).toBeChecked();
        await expect(win.metadataBox()).not.toBeChecked();
        await win.cancel();

        // ("Another stage" is {OJS OMP}: the server's only entry is Production.)

        // Back to the start: the notice, and the third line gone.
        await panel.reland();
        win = await panel.openEdit(ana.name, ROLE.moderator);
        await win.recommendOnlyBox().uncheck();
        await win.metadataBox().check();
        await okSaved(win);
        await expect.poll(() => linesOf(ana)).toEqual(plain(ana));

        // Control: the second Moderator's row never changed.
        await expect.poll(() => linesOf(ravi)).toEqual(plain(ravi));
    });

    test('S4: what an assigned editor may change on the panel', async ({asUser, opsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s4', testInfo);
        const p = await seedServer(opsApi, tag, {
            sa: ['Sam', 'Moderator', ['sectionEditor']],
            sb: ['Sue', 'Second', ['sectionEditor']],
            ed: ['Erin', 'Manager', ['manager']],
            mgr: ['Mira', 'Manager', ['manager']],
            au: ['Ava', 'Author', ['author']],
        });
        const {submissionId} = await opsApi.createSubmission({
            tag,
            context: tag,
            submitter: p.au.username,
            title: `Preprint ${tag}`,
            participants: [
                part(p.sa, 'sectionEditor'),
                part(p.sb, 'sectionEditor', {recommendOnly: true}),
                part(p.ed, 'manager', {recommendOnly: true}),
            ],
        });

        // The deciding Moderator: "Assign"; their own row and the recommending
        // Preprint Server manager's row offer no "Edit"; the second
        // Moderator's row does, both boxes ticked; "Cancel" asks nothing.
        const saPage = await pageFor(asUser, p.sa.username);
        const saDialogs = new LeavePageDialogs(saPage);
        const sa = panelOn(saPage, tag);
        await sa.goto(submissionId);
        await sa.expectRows([
            ParticipantsPanel.lines(p.ed, ROLE.manager, {recommendOnly: true}),
            ParticipantsPanel.lines(p.sa, ROLE.moderator),
            ParticipantsPanel.lines(p.sb, ROLE.moderator, {recommendOnly: true}),
            ParticipantsPanel.lines(p.au, ROLE.author),
        ]);
        await expect(sa.assignButton()).toBeVisible();
        await sa.expectMenu(p.sa.name, ['Notify', 'Remove']);
        await sa.expectMenu(p.ed.name, ['Notify', 'Remove']);
        let win = await sa.openEdit(p.sb.name);
        await expect(win.recommendOnlyBox()).toBeChecked();
        await expect(win.metadataBox()).toBeChecked();
        await win.cancel();
        expect(saDialogs.count()).toBe(0);

        // The recommending Moderator: "Assign"; the deciding Moderator's row
        // offers no "Edit"; the Author's does, with "Permissions" and no
        // "Assignment privileges".
        const sbPage = await pageFor(asUser, p.sb.username);
        const sb = panelOn(sbPage, tag);
        await sb.goto(submissionId);
        await expect(sb.assignButton()).toBeVisible();
        await sb.expectMenu(p.sa.name, ['Notify', 'Remove']);
        win = await sb.openEdit(p.au.name);
        await expect(win.metadataBox()).toBeVisible();
        await expect(win.recommendOnlyBox()).toHaveCount(0);
        await win.cancel();

        // The recommending Preprint Server manager: the deciding Moderator's
        // row offers "Edit", with "Permissions" and no "Assignment privileges".
        const edPage = await pageFor(asUser, p.ed.username);
        const ed = panelOn(edPage, tag);
        await ed.goto(submissionId);
        win = await ed.openEdit(p.sa.name);
        await expect(win.metadataBox()).toBeVisible();
        await expect(win.recommendOnlyBox()).toHaveCount(0);
        await win.cancel();

        // (The Production editor bullet is {OJS OMP}: a server has none.)

        // Control: the Preprint Server manager assigned to nothing is offered
        // "Edit" on the two rows where the deciding Moderator had none.
        const mgrPage = await pageFor(asUser, p.mgr.username);
        const mgr = panelOn(mgrPage, tag);
        await mgr.goto(submissionId);
        for (const person of [p.sa, p.ed]) {
            await mgr.openMenu(person.name);
            await expect(mgr.menuItem('Edit')).toBeVisible();
            await mgr.closeMenu(person.name);
        }
    });

    test('S5: remove a participant', async ({asUser, opsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s5', testInfo);
        const p = await seedServer(opsApi, tag, {
            mgr: ['Mira', 'Manager', ['manager']],
            mo: ['Moe', 'Moderator', ['sectionEditor']],
            au: ['Ava', 'Author', ['author']],
        });
        const {submissionId} = await opsApi.createSubmission({
            tag,
            context: tag,
            submitter: p.au.username,
            title: `Preprint ${tag}`,
            participants: [part(p.mo, 'sectionEditor')],
        });

        // The given: the Preprint Server manager opens a discussion with the
        // Moderator through their row's "Notify" (footnote s).
        const page = await pageFor(asUser, p.mgr.username);
        const panel = panelOn(page, tag);
        await panel.goto(submissionId, {menuKey: PRODUCTION});
        const notify = await panel.openNotify(p.mo.name, ROLE.moderator);
        await notify.chooseTemplate(DISCUSSION);
        await notify.send();

        // Control, before "OK": the discussion names the Moderator.
        await panel.reland();
        let discussion = await panel.openDiscussion(panel.discussionRows(DISCUSSIONS, DISCUSSION), DISCUSSION);
        await discussion.expectParticipants([p.mgr.username, p.mo.username]);
        await discussion.close();

        // The dialog: "Remove" in red, the question, "OK" in red and
        // "Cancel"; "Cancel" keeps the row.
        await panel.reland();
        await panel.openMenu(p.mo.name, ROLE.moderator);
        await expect(panel.menuItem('Remove')).toHaveClass(/text-negative/);
        await panel.menuItem('Remove').click();
        let dialog = new RemoveParticipantDialog(page);
        await dialog.expectOpen();
        await expect(dialog.title()).toBeVisible();
        await expect(dialog.root).toContainText(REMOVE_SENTENCE);
        await expect(dialog.okButton()).toHaveClass(/text-negative/);
        await expect(dialog.cancelButton()).toBeVisible();
        await dialog.cancel();
        await panel.expectRows([ParticipantsPanel.lines(p.mo, ROLE.moderator), ParticipantsPanel.lines(p.au, ROLE.author)]);

        // "OK": the Moderator row is gone (the Author's stays).
        dialog = await panel.openRemove(p.mo.name, ROLE.moderator);
        await dialog.ok();
        await panel.expectRows([ParticipantsPanel.lines(p.au, ROLE.author)]);

        // ("The other stages" and "The dashboard" are {OJS OMP}.)

        // The discussion no longer names the Moderator.
        await panel.reland();
        discussion = await panel.openDiscussion(panel.discussionRows(DISCUSSIONS, DISCUSSION), DISCUSSION);
        await discussion.expectParticipants([p.mgr.username]);
        await discussion.close();

        // The Activity Log.
        await panel.reland();
        await panel.frame.openActivityLog();
        await expect(
            panel.frame.activityLogRow(`${p.mo.name} (${p.mo.username}) was removed from this submission as a Moderator.`)
        ).toHaveCount(1);
        await panel.frame.closeActivityLog();
    });

    test('S6: notify a participant', async ({asUser, opsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s6', testInfo);
        const title = `Preprint ${tag}`;
        const message = 'Please check the reference list.';
        const p = await seedServer(opsApi, tag, {
            mgr: ['Mira', 'Manager', ['manager']],
            sa: ['Sam', 'Moderator', ['sectionEditor']],
            sb: ['Sue', 'Second', ['sectionEditor']],
            au: ['Ava', 'Author', ['author']],
        });
        const {submissionId} = await opsApi.createSubmission({
            tag,
            context: tag,
            submitter: p.au.username,
            title,
            participants: [part(p.sa, 'sectionEditor'), part(p.sb, 'sectionEditor')],
        });
        // The given: the second Moderator unticked "Enable these types of
        // notifications." on "Discussion added." (no scenario key; footnote s).
        await setNotificationBox(asUser, tag, p.sb.username, DISCUSSION_SETTING, 'allow', false);

        // The "Notify" window.
        const page = await pageFor(asUser, p.mgr.username);
        const panel = panelOn(page, tag);
        await panel.goto(submissionId, {menuKey: PRODUCTION});
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

        // A predefined message, replaced by the manager's text.
        await win.chooseTemplate(DISCUSSION);
        expect(flat(await win.messageText()).trim()).toBe('Please enter your message.');
        await win.typeMessage(message);
        await win.send();
        await expect(participantNotice(page, NOTICES.notified)).toBeVisible();

        // The first Moderator's mailbox.
        const mail = await pkpMail.find({to: p.sa.email, subject: DISCUSSION});
        expect(mail.From.Address).toBe(p.mgr.email);
        const full = await pkpMail.fullMessage(mail.ID);
        const body = flat(full.Text);
        expect(body.trim().startsWith(message)).toBe(true);
        expect(body).toContain('Reply to this comment at');
        expect(pkpMail.extractLink(full.HTML, 'unsubscribe')).toMatch(/\/notification\/unsubscribe\?/);

        // The discussion: one "Discussion (Production)" (the empty "Notify"
        // added none), its participants and first entry.
        await panel.reland();
        const rows = panel.discussionRows(DISCUSSIONS, DISCUSSION);
        await expect(rows).toHaveCount(1);
        const discussion = await panel.openDiscussion(rows, DISCUSSION);
        await discussion.expectParticipants([p.sa.username, p.mgr.username]);
        await expect(discussion.entries().first()).toContainText(message);
        await discussion.close();

        // The first Moderator's Tasks panel.
        const task = DISCUSSION_TASK({creatorName: p.mgr.name, name: DISCUSSION, message});
        const saPage = await pageFor(asUser, p.sa.username);
        const saTasks = await openTasks(saPage, tag);
        await expect(saTasks.row(task).filter({hasText: title})).toHaveCount(1);

        // The Activity Log.
        await panel.reland();
        await panel.frame.openActivityLog();
        await expect(panel.frame.activityLogRow('Notification sent to users.').filter({hasText: p.mgr.name})).toHaveCount(1);
        const emailRow = panel.frame.activityLogRow(`An email has been sent: ${DISCUSSION}`);
        await expect(emailRow).toHaveCount(1);
        await expect(await panel.revealViewEmailLink(emailRow)).toBeVisible();
        await panel.frame.closeActivityLog();

        // "Notify" to the second Moderator: sent, a second discussion.
        await panel.reland();
        const second = await panel.openNotify(p.sb.name);
        await second.chooseTemplate(DISCUSSION);
        await second.typeMessage(message);
        await second.send();
        await expect(participantNotice(page, NOTICES.notified)).toBeVisible();
        await panel.reland();
        await expect(panel.discussionRows(DISCUSSIONS, DISCUSSION)).toHaveCount(2);

        // The second Moderator's mailbox and Tasks panel stay empty of it;
        // control: the first one's email, sent the same way, arrived.
        await pkpMail.expectNone({
            to: p.sb.email,
            subject: DISCUSSION,
            afterControl: {to: p.sa.email, subject: DISCUSSION},
        });
        const sbPage = await pageFor(asUser, p.sb.username);
        const sbTasks = await openTasks(sbPage, tag);
        await expect(sbTasks.grid()).toBeVisible();
        await expect(sbTasks.rows().filter({hasText: title})).toHaveCount(0);
    });

    test("S7: a role's options: recommend only, and no metadata permission", async ({asUser, opsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s7', testInfo);
        const p = await seedServer(opsApi, tag, {
            mgr: ['Mira', 'Manager', ['manager']],
            sa: ['Sam', 'Moderator', ['sectionEditor']],
            sb: ['Sue', 'Second', ['sectionEditor']],
            sc: ['Tia', 'Third', ['sectionEditor']],
            m2: ['Max', 'Another', ['manager']],
            au: ['Ava', 'Author', ['author']],
        });
        const first = await opsApi.createSubmission({
            tag,
            context: tag,
            submitter: p.au.username,
            title: `First ${tag}`,
            participants: [part(p.sa, 'sectionEditor')],
        });
        const second = await opsApi.createSubmission({
            tag: `${tag}b`,
            context: tag,
            submitter: p.au.username,
            title: `Second ${tag}`,
            participants: [part(p.sb, 'sectionEditor')],
        });

        // An assignment before the change.
        const page = await pageFor(asUser, p.mgr.username);
        const panel = panelOn(page, tag);
        await panel.goto(first.submissionId, {menuKey: PRODUCTION});
        let win = await panel.openEdit(p.sa.name);
        await expect(win.recommendOnlyBox()).not.toBeChecked();
        await expect(win.metadataBox()).toBeChecked();
        await win.cancel();

        // The Role Options of the Moderator role.
        const roles = new RoleOptionsForm(page, tag);
        await roles.gotoRoles();
        await roles.openRole(ROLE.moderator);
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
            await panel.goto(submission.submissionId, {menuKey: PRODUCTION});
            win = await panel.openEdit(person.name);
            await expect(win.metadataBox()).not.toBeChecked();
            await expect(win.recommendOnlyBox()).not.toBeChecked();
            await win.cancel();
            await expect
                .poll(async () => (await panel.rowLines()).find((lines) => lines[1] === person.name))
                .toEqual(ParticipantsPanel.lines(person, ROLE.moderator));
        }

        // A new assignment starts from the role's options.
        await panel.goto(first.submissionId, {menuKey: PRODUCTION});
        let assign = await panel.openAssign();
        await assign.chooseRole(ROLE.moderator);
        await assign.search();
        await assign.choosePerson(p.sc.name);
        await expect(assign.recommendOnlyBox()).toBeVisible();
        await expect(assign.recommendOnlyBox()).toBeChecked();
        await expect(assign.metadataBox()).toBeVisible();
        await expect(assign.metadataBox()).not.toBeChecked();
        await assign.ok();
        await expect
            .poll(async () => (await panel.rowLines()).find((lines) => lines[1] === p.sc.name))
            .toEqual(ParticipantsPanel.lines(p.sc, ROLE.moderator, {recommendOnly: true}));

        // Control: the Preprint Server manager role, left as it was.
        await panel.reland();
        assign = await panel.openAssign();
        expect(await assign.selectedRole()).toBe(ROLE.manager);
        await assign.choosePerson(p.m2.name);
        await expect(assign.recommendOnlyBox()).toBeVisible();
        await expect(assign.recommendOnlyBox()).not.toBeChecked();
        await expect(assign.metadataBox()).toBeHidden();
        await expect(assign.boxHeading('Permissions')).toBeHidden();
        await assign.cancel();
    });

    test('S9: assign a Moderator on a preprint server', {tag: '@smoke'}, async ({asUser, opsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s9', testInfo);
        const message = 'Please moderate this preprint.';
        const p = await seedServer(opsApi, tag, {
            mgr: ['Mira', 'Manager', ['manager']],
            m2: ['Max', 'Another', ['manager']],
            mo: ['Moe', 'Moderator', ['sectionEditor']],
            au: ['Ava', 'Author', ['author']],
            a2: ['Abe', 'Second', ['author']],
        });
        const {submissionId} = await opsApi.createSubmission({
            tag,
            context: tag,
            submitter: p.au.username,
            title: `Preprint ${tag}`,
        });

        // The role list: the manager role, "Moderator" and "Author", the
        // manager role preselected; no box shows before a person is chosen.
        const page = await pageFor(asUser, p.mgr.username);
        const panel = panelOn(page, tag);
        await panel.goto(submissionId, {menuKey: PRODUCTION});
        await panel.expectRows([ParticipantsPanel.lines(p.au, ROLE.author)]);
        let win = await panel.openAssign();
        await expect(win.title()).toHaveText('Assign Participant');
        expect(await win.roleOptions()).toEqual([ROLE.manager, ROLE.moderator, ROLE.author]);
        expect(await win.selectedRole()).toBe(ROLE.manager);
        await expect(win.recommendOnlyBox()).toBeHidden();
        await expect(win.metadataBox()).toBeHidden();

        // "Moderator": "Assignment privileges" unticked, "Permissions" ticked.
        await win.chooseRole(ROLE.moderator);
        await win.search();
        await win.expectPeople([p.mo.name]);
        await win.choosePerson(p.mo.name);
        await expect(win.boxHeading('Assignment privileges')).toBeVisible();
        await expect(win.recommendOnlyBox()).toBeVisible();
        await expect(win.recommendOnlyBox()).not.toBeChecked();
        await expect(win.boxHeading('Permissions')).toBeVisible();
        await expect(win.metadataBox()).toBeVisible();
        await expect(win.metadataBox()).toBeChecked();
        await expect(win.root.getByText(BOX_LABELS.recommendOnly)).toBeVisible();
        await expect(win.root.getByText(BOX_LABELS.canChangeMetadata)).toBeVisible();

        // The predefined message: a blank entry, "Discussion (Production)"
        // and "Assign Editor"; the discussion template, replaced; "OK".
        await expect(win.root.getByText(TEMPLATE_LABEL, {exact: true})).toBeVisible();
        expect((await win.templateOptions()).sort()).toEqual(['', DISCUSSION, 'Assign Editor'].sort()); // the list has no fixed order (spec note f)
        await win.chooseTemplate(DISCUSSION);
        expect(flat(await win.messageText()).trim()).toBe('Please enter your message.');
        await win.typeMessage(message);
        await win.ok();
        await expect(participantNotice(page, NOTICES.added)).toBeVisible();
        await panel.expectRows([ParticipantsPanel.lines(p.mo, ROLE.moderator), ParticipantsPanel.lines(p.au, ROLE.author)]);

        // The Moderator's mailbox: from the manager, the message, the
        // discussion footer and its unsubscribe link.
        const mail = await pkpMail.find({to: p.mo.email, subject: DISCUSSION});
        expect(mail.From.Address).toBe(p.mgr.email);
        const full = await pkpMail.fullMessage(mail.ID);
        const body = flat(full.Text);
        expect(body.trim().startsWith(message)).toBe(true);
        expect(body).toContain('Reply to this comment at');
        expect(body).toMatch(/or unsubscribe .*from emails sent by/);
        expect(pkpMail.extractLink(full.HTML, 'unsubscribe')).toMatch(/\/notification\/unsubscribe\?/);

        // The Activity Log.
        await panel.reland();
        await panel.frame.openActivityLog();
        await expect(
            panel.frame.activityLogRow(`${p.mo.name} (${p.mo.username}) was assigned to this submission as a Moderator.`)
        ).toHaveCount(1);
        await panel.frame.closeActivityLog();

        // "Author": "Permissions" ticked, no "Assignment privileges"; "Cancel".
        await panel.reland();
        win = await panel.openAssign();
        await win.chooseRole(ROLE.author);
        await win.search();
        await win.choosePerson(p.a2.name);
        await expect(win.metadataBox()).toBeVisible();
        await expect(win.metadataBox()).toBeChecked();
        await expect(win.recommendOnlyBox()).toBeHidden();
        await expect(win.boxHeading('Assignment privileges')).toBeHidden();
        await win.cancel();

        // Control: the second Preprint Server Manager from the preselected
        // role's list: "Assignment privileges" appears, no "Permissions".
        win = await panel.openAssign();
        expect(await win.selectedRole()).toBe(ROLE.manager);
        await win.choosePerson(p.m2.name);
        await expect(win.recommendOnlyBox()).toBeVisible();
        await expect(win.boxHeading('Assignment privileges')).toBeVisible();
        await expect(win.metadataBox()).toBeHidden();
        await expect(win.boxHeading('Permissions')).toBeHidden();
        await win.cancel();
        await panel.expectRows([ParticipantsPanel.lines(p.mo, ROLE.moderator), ParticipantsPanel.lines(p.au, ROLE.author)]);
    });
});
