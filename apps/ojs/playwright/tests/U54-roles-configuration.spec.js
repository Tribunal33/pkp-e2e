// @ts-check
/**
 * @file playwright/tests/U54-roles-configuration.spec.js
 *
 * Roles configuration — OJS suite, one test per canonical scenario the spec
 * runs on OJS (scenarios 1–7, all common; scenario 8 is OMP-only).
 * Spec: docs/specs/U54-roles-configuration.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1 🐞: every row a test opens is found by name; no test asserts which
 *   rows lack the arrow. A role S3–S6 open can land first (A13's storage
 *   order), where no screen offers its "Edit" or "Remove": the scenario
 *   then runs again from its seeding on a fresh context
 *   (`replayWhenFirstRow`, at most three attempts, an `app-defect`
 *   annotation per landing; `.reports/flake-2026-09-29/u54s3/diagnosis.md`).
 * - A2 🐞: S1 reads the "Journal manager" row's boxes as greyed only,
 *   never ticked or empty, and S2's stage filter never looks for it.
 * - A3 🐞: S5 saves "Managing editor"'s window and reads nothing of its
 *   stages afterwards.
 * - A5 🐞: every box, and the list after "Remove", is read after a reload,
 *   never right after the press (S2, S6).
 * - A9 🐞: S1 and S2 never read whether the filter lists hide again after
 *   a choice; S1 reads the count line only.
 * - A11 🐞: S5 presses "Cancel" in every window whose Settings box is
 *   greyed, never "OK".
 * - A4 🐞: S6 quotes the "Confirm" sentence as the spec gives it; what the
 *   sentence promises is the finding's claim, left unasserted.
 * - A6 ❓: S6 reads "Archive desk"'s refusal as the spec states it.
 * - A13 🐞: every row is found by name; S1 reads the order of a new
 *   journal's roles only.
 * - A8 🐞, A10 🐞, A7 ❓, A12 ❓: no scenario reaches them here.
 * - OMP1, OPS1, OPS2, OPS3: other apps' territory.
 *
 * Every test seeds its own scratch journal with throwaway accounts (footnote
 * s); publicknowledge and the seeded roster stay untouched (A1, A7). The
 * roles, task templates and "Site Access Options" are the install's unless
 * the scenario seeds `customRoles[]`. Every actor is opened through
 * `asUser` (no default user: a multi-actor test sets none, patterns.md
 * "Fixture selection"); the signed-out visitor of S7 is a fresh anonymous
 * context. Each test acts as its own throwaway manager, so the notices at
 * the top right (which the account's next notification fetch clears) are
 * read in the test that caused them. Every absence is read settled (after
 * the list's own redraw, a reload, or a closed window) beside a positive
 * control taken the same way (M4, M6). Everything runs in the parallel
 * `ojs` project.
 */
const {test, expect} = require('../support/fixtures.js');
const {unordered} = require('../../../../shared/playwright/support/order.js');
const {UsersListPage} = require('../../../../shared/playwright/pages/UsersManagementPages.js');
const {TaskTemplatesTab} = require('../../../../shared/playwright/pages/TasksDiscussionsPages.js');
const {RolesTab, SiteAccessTab, replayWhenFirstRow} = require('../../../../shared/playwright/pages/RolesConfigurationPages.js');
const {SendInvitationWizard} = require('../pages/UserInvitationPages.js');
const {siteHeader, loginFormRegisterLink} = require('../pages/RegistrationPages.js');

const STAGES = ['Submission', 'Review', 'Copyediting', 'Production'];
const COLUMNS = ['Role Name', 'Permission level', ...STAGES];
const LEVEL = {
    manager: 'Journal Manager',
    subEditor: 'Section Editor',
    assistant: 'Assistant',
    author: 'Author',
    reviewer: 'Reviewer',
    reader: 'Reader',
    subscriptionManager: 'Subscription Manager',
};
const LEVELS = Object.values(LEVEL);
const S = 'Submission';
const R = 'Review';
const C = 'Copyediting';
const P = 'Production';

/**
 * The roles of a new journal, in the list's order (the spec's roles table):
 * name, level, the stages ticked, whether every box is greyed, and the only
 * open boxes of a row that has some greyed.
 */
const DEFAULT_ROLES = [
    {name: 'Journal manager', level: LEVEL.manager, stages: null, open: []},
    {name: 'Journal editor', level: LEVEL.manager, stages: [S, R, C, P], open: []},
    {name: 'Production editor', level: LEVEL.manager, stages: [C, P], open: []},
    {name: 'Section editor', level: LEVEL.subEditor, stages: [S, R, C, P], open: STAGES},
    {name: 'Guest editor', level: LEVEL.subEditor, stages: [S, R, C, P], open: STAGES},
    {name: 'Copyeditor', level: LEVEL.assistant, stages: [C], open: STAGES},
    {name: 'Designer', level: LEVEL.assistant, stages: [P], open: STAGES},
    {name: 'Funding coordinator', level: LEVEL.assistant, stages: [S, R], open: STAGES},
    {name: 'Indexer', level: LEVEL.assistant, stages: [P], open: STAGES},
    {name: 'Layout Editor', level: LEVEL.assistant, stages: [P], open: STAGES},
    {name: 'Marketing and sales coordinator', level: LEVEL.assistant, stages: [C], open: STAGES},
    {name: 'Proofreader', level: LEVEL.assistant, stages: [P], open: STAGES},
    {name: 'Author', level: LEVEL.author, stages: [S, R, C, P], open: STAGES},
    {name: 'Translator', level: LEVEL.author, stages: [S, R, C, P], open: STAGES},
    {name: 'Reviewer', level: LEVEL.reviewer, stages: [R], open: [R]},
    {name: 'Reader', level: LEVEL.reader, stages: [], open: []},
    {name: 'Subscription Manager', level: LEVEL.subscriptionManager, stages: [], open: STAGES},
    {name: 'Editorial Board Member', level: LEVEL.assistant, stages: [], open: STAGES},
];

const OPT = {
    selfReg: 'Allow user self-registration',
    recommend:
        'This role is only allowed to recommend a review decision and will require an authorised editor to record a final decision.',
    metadata: 'Permit submission metadata edit.',
    masthead: 'Consider role in masthead list',
    settings: 'Permit changes to Settings',
};
const REQUIRED = 'This field is required.';
const SAVED = 'Your changes have been saved.';
const REMOVE_SENTENCE =
    'You are about to remove this role from this context. This operation will also delete related settings and all the users assignments to this role. Do you want to continue?';
const PRODUCTION_STAGE = 'Production Stage';
const LIMIT_ROLES = 'Limit access to specific roles';

const SITE = {
    siteGroup: 'Site Access',
    siteBox: 'Users must be registered and log in to view the journal site.',
    contentGroup: 'View Article Content',
    contentBox: 'Users must be registered and log in to view open access content.',
    registrationGroup: 'User Registration',
    open: 'Visitors can register a user account with the journal.',
    closed:
        'The Journal Manager will register all user accounts. Editors or Section Editors may register user accounts for reviewers.',
    closedMessage: 'This journal is currently not accepting user registrations.',
};

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u54s${scenario}ojsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** The manager every scenario signs in as (footnote s). */
function managerEntry(tag) {
    return {username: `m${tag}`, givenName: 'Mara', familyName: 'Scratchmanager', roles: ['manager']};
}

/** A signed-in page for an actor (a fresh `asUser` context). */
async function signedIn(asUser, username) {
    const context = await asUser(username);
    return context.newPage();
}

/** Record the browser questions a page raises (and dismiss them). */
function recordQuestions(page) {
    const questions = [];
    page.on('dialog', (dialog) => {
        questions.push(dialog.message());
        (dialog.type() === 'beforeunload' ? dialog.accept() : dialog.dismiss()).catch(() => {});
    });
    return questions;
}

/**
 * From the Roles page: the "Users" tab, "Invite to a role", "Enter details"
 * for an address no account uses; resolves with the roles the new role row's
 * list offers (U06 scenario 1's walk).
 */
async function inviteRoleOptions(page, contextPath, email) {
    const roles = new RolesTab(page, contextPath, {stages: STAGES});
    await roles.usersTab.click();
    const users = new UsersListPage(page, contextPath);
    await expect(users.inviteButton).toBeVisible({timeout: 30_000});
    await users.inviteButton.click();
    const wizard = new SendInvitationWizard(page);
    await wizard.searchAndContinue(email);
    const select = wizard.newRoleRow().getByLabel(/^Select a new role/);
    await expect(select.locator('option').nth(1)).toBeAttached();
    return (await select.locator('option').allInnerTexts()).map((s) => s.trim());
}

test.describe('roles configuration', () => {
    test('S1: the "Roles" list of a new journal', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag(1, testInfo);
        const manager = managerEntry(tag);
        await ojsApi.createContext({tag, users: [manager]});
        const mp = await signedIn(asUser, manager.username);
        const roles = new RolesTab(mp, tag, {stages: STAGES});

        // The list (Rule 1; Fields, the "Roles" tab).
        await mp.goto(roles.url());
        await expect(roles.pageHeading).toHaveText('Users & Roles');
        await roles.openTab();
        await expect(roles.title).toBeVisible();
        await expect(roles.searchLink).toBeVisible();
        await expect(roles.createLink).toBeVisible();
        expect(await roles.columns()).toEqual(COLUMNS);

        // The rows: the roles table, in no fixed order (A13), each with its
        // level and, but for the manager row (A2), its stages; the line
        // (Rules 2, 4).
        await expect(roles.rows()).toHaveCount(DEFAULT_ROLES.length);
        expect(unordered(await roles.rowNames())).toEqual(unordered(DEFAULT_ROLES.map((r) => r.name)));
        for (const role of DEFAULT_ROLES) {
            await expect(roles.level(role.name), role.name).toHaveText(role.level);
            const states = await roles.boxStates(role.name);
            for (const stage of STAGES) {
                if (role.stages) {
                    expect(states[stage].checked, `${role.name} ${stage} ticked`).toBe(role.stages.includes(stage));
                }
                // Greyed boxes (Rule 7).
                expect(states[stage].disabled, `${role.name} ${stage} greyed`).toBe(!role.open.includes(stage));
            }
        }
        await roles.expectPagingLine('1 - 18 of 18 items');

        // A level filter (Rules 3a, 3b).
        await roles.openFilters();
        await expect(roles.filterLabel('List roles assigned to')).toBeVisible();
        await expect(roles.filterLabel('With permission level set to')).toBeVisible();
        await roles.chooseFilter('level', LEVEL.author);
        await expect(roles.rows()).toHaveCount(2);
        expect(unordered(await roles.rowNames())).toEqual(unordered(['Author', 'Translator']));
        await roles.expectPagingLine('1 - 2 of 2 items');

        // The filter cleared by a reload (Rule 3b).
        await roles.reload();
        await expect(roles.rows()).toHaveCount(DEFAULT_ROLES.length);
        await roles.expectPagingLine('1 - 18 of 18 items');

        // Ten per page: ten rows, then the other eight; which roles each
        // page holds is not fixed (Rule 4, A13).
        await expect(roles.itemsPerPageBox).toBeVisible();
        expect(await roles.itemsPerPageOptions()).toEqual(['10', '25', '50', '75', '100']);
        await roles.chooseItemsPerPage('10');
        await expect(roles.rows()).toHaveCount(10);
        await roles.expectPagingLine('1 - 10 of 18 items');
        await expect(roles.pageLink('2')).toBeVisible();
        await roles.gotoListPage('2');
        await expect(roles.rows()).toHaveCount(8);
        await roles.expectPagingLine('11 - 18 of 18 items');
        await roles.reload();
        await expect(roles.rows()).toHaveCount(DEFAULT_ROLES.length);
        await roles.expectPagingLine('1 - 18 of 18 items');

        // Control: the greyed "Production" box of "Reader" does not tick,
        // and no request leaves; after a reload it is still unticked; an
        // open box of the same column beside it is pressable (Rule 7).
        const stageRequests = [];
        mp.on('request', (r) => {
            if (/user-group-grid\/(un)?assign-stage/.test(r.url())) {
                stageRequests.push(r.url());
            }
        });
        const readerBox = roles.stageBox('Reader', P);
        await expect(readerBox).toBeDisabled();
        await readerBox.click({force: true});
        await expect(readerBox).not.toBeChecked();
        await roles.reload();
        await expect(roles.stageBox('Reader', P)).not.toBeChecked();
        await expect(roles.stageBox('Reader', P)).toBeDisabled();
        await expect(roles.stageBox('Designer', P)).toBeEnabled();
        expect(stageRequests).toEqual([]);
    });

    test('S2: give a role a stage, then take it away', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag(2, testInfo);
        const manager = managerEntry(tag);
        await ojsApi.createContext({tag, users: [manager]});
        const mp = await signedIn(asUser, manager.username);
        const questions = recordQuestions(mp);
        const roles = new RolesTab(mp, tag, {stages: STAGES});
        const templates = new TaskTemplatesTab(mp, tag);
        const EBM = 'Editorial Board Member';

        // The box ticked: the notice, nothing asks (Rule 8).
        await roles.goto();
        await expect(roles.stageBox(EBM, P)).not.toBeChecked();
        const ticked = await roles.pressStageBox(EBM, P);
        expect(ticked.status()).toBe(200);
        await expect(roles.notice(`${EBM} role assigned to ${P} stage.`)).toBeVisible();
        await expect(mp.getByRole('dialog')).toHaveCount(0);
        expect(questions).toEqual([]);
        await roles.reload();
        await expect(roles.stageBox(EBM, P)).toBeChecked();

        // The stage filter (Rule 3a).
        await roles.chooseFilter('stage', P);
        await expect(roles.row(EBM)).toHaveCount(1);
        await expect(roles.row('Designer')).toHaveCount(1);

        // The task template window (Rules 6, 22).
        await templates.goto();
        let win = await templates.openAdd(PRODUCTION_STAGE);
        await win.radio(LIMIT_ROLES).check();
        await expect(win.roleBox(EBM)).toBeVisible();

        // The box unticked, the role's last stage (Rules 8, 9).
        await roles.goto();
        await expect(roles.stageBox(EBM, P)).toBeChecked();
        const unticked = await roles.pressStageBox(EBM, P);
        expect(unticked.status()).toBe(200);
        await expect(roles.notice(`${EBM} role unassigned from ${P} stage.`)).toBeVisible();
        await roles.reload();
        for (const stage of STAGES) {
            await expect(roles.stageBox(EBM, stage), stage).not.toBeChecked();
        }

        // The stage filter again: gone, "Designer" still there (Rule 3a).
        await roles.chooseFilter('stage', P);
        await expect(roles.row('Designer')).toHaveCount(1);
        await expect(roles.row(EBM)).toHaveCount(0);

        // Control: the template window offers no "Editorial Board Member",
        // "Designer" still offered (Rules 6, 22).
        await templates.goto();
        win = await templates.openAdd(PRODUCTION_STAGE);
        await win.radio(LIMIT_ROLES).check();
        await expect(win.roleBox('Designer')).toBeVisible();
        await expect(win.roleBox(EBM)).toHaveCount(0);
    });

    test('S3: create a role', async ({asUser, ojsApi}, testInfo) => replayWhenFirstRow(testInfo, async () => {
        test.slow();
        const tag = makeTag(3, testInfo);
        const manager = managerEntry(tag);
        await ojsApi.createContext({tag, users: [manager]});
        const mp = await signedIn(asUser, manager.username);
        const roles = new RolesTab(mp, tag, {stages: STAGES});

        // The window as it opens (Rule 12; Fields, the role window).
        await roles.goto();
        let win = await roles.openCreate();
        await expect(win.title).toHaveText('Create New Role');
        await expect(win.detailsHeading).toBeVisible();
        expect(await win.levelLabel()).toBe(LEVEL.manager);
        expect(await win.levelOptions()).toEqual(LEVELS);
        await expect(win.nameBox()).toHaveValue('');
        await expect(win.abbrevBox()).toHaveValue('');
        await expect(win.optionBox(OPT.metadata)).toBeChecked();
        await expect(win.optionBox(OPT.metadata)).toBeDisabled();
        for (const label of [OPT.selfReg, OPT.recommend, OPT.masthead, OPT.settings]) {
            await expect(win.optionBox(label), label).not.toBeChecked();
        }
        await expect(win.optionBox(OPT.selfReg)).toBeDisabled();
        await expect(win.optionBox(OPT.recommend)).toBeEnabled();
        await expect(win.optionBox(OPT.settings)).toBeEnabled();
        await expect(win.optionBox(OPT.masthead)).toBeEnabled();
        await expect(win.requiredLine).toBeVisible();
        await expect(win.cancelLink).toBeVisible();
        await expect(win.okButton).toBeVisible();

        /** The four level-bound boxes and the masthead box, as the table gives them. */
        async function expectOptions({selfReg, recommend, settings}) {
            const want = {[OPT.selfReg]: selfReg, [OPT.recommend]: recommend, [OPT.settings]: settings};
            for (const [label, open] of Object.entries(want)) {
                if (open) {
                    await expect(win.optionBox(label), `${label} open`).toBeEnabled();
                } else {
                    await expect(win.optionBox(label), `${label} greyed`).toBeDisabled();
                }
            }
            await expect(win.optionBox(OPT.metadata), 'metadata open').toBeEnabled();
            await expect(win.optionBox(OPT.metadata), 'metadata still ticked').toBeChecked();
            // "Consider role in masthead list" open at every level.
            await expect(win.optionBox(OPT.masthead), 'masthead open').toBeEnabled();
        }

        /** "Stage Assignment" on screen with these boxes open (and the rest greyed). */
        async function expectStages(open) {
            await expect(win.stageSection).toBeVisible();
            expect(await win.stageLabels()).toEqual(STAGES);
            for (const stage of STAGES) {
                if (open.includes(stage)) {
                    await expect(win.stageBox(stage), `${stage} open`).toBeEnabled();
                } else {
                    await expect(win.stageBox(stage), `${stage} greyed`).toBeDisabled();
                }
            }
        }

        // "Section Editor" (Rule 13).
        await win.chooseLevel(LEVEL.subEditor);
        await expectStages(STAGES);
        await expectOptions({selfReg: false, recommend: true, settings: false});

        // "Assistant".
        await win.chooseLevel(LEVEL.assistant);
        await expectStages(STAGES);
        await expectOptions({selfReg: false, recommend: false, settings: false});

        // "Author".
        await win.chooseLevel(LEVEL.author);
        await expectStages(STAGES);
        await expectOptions({selfReg: true, recommend: false, settings: false});

        // "Reader": "Stage Assignment" hidden.
        await win.chooseLevel(LEVEL.reader);
        await expect(win.stageSection).toBeHidden();
        await expectOptions({selfReg: true, recommend: false, settings: false});

        // "Reviewer": only "Review" open.
        await win.chooseLevel(LEVEL.reviewer);
        await expectStages([R]);
        await expectOptions({selfReg: true, recommend: false, settings: false});

        // "Subscription Manager".
        await win.chooseLevel(LEVEL.subscriptionManager);
        await expectStages(STAGES);
        await expectOptions({selfReg: false, recommend: false, settings: false});

        // A tick the level greys out (Rule 13).
        await win.chooseLevel(LEVEL.author);
        await win.optionBox(OPT.selfReg).check();
        await win.chooseLevel(LEVEL.assistant);
        await expect(win.optionBox(OPT.selfReg)).toBeDisabled();
        await expect(win.optionBox(OPT.selfReg)).toBeChecked();

        // The name refused (Rule 15a).
        await win.abbrevBox().fill('DE');
        await win.pressOk();
        await expect(await win.errorFor(win.nameBox())).toHaveText(REQUIRED);
        await expect(win.form).toBeVisible();

        // The abbreviation refused.
        await win.nameBox().fill('Data editor');
        await win.abbrevBox().fill('');
        await win.pressOk();
        await expect(await win.errorFor(win.abbrevBox())).toHaveText(REQUIRED);
        await expect(win.form).toBeVisible();

        // Saved (Rule 15a).
        await win.abbrevBox().fill('DE');
        await win.stageBox(C).check();
        const saved = await win.save();
        expect(saved.status()).toBe(200);
        await expect(roles.notice(SAVED)).toBeVisible();
        await expect(roles.row('Data editor')).toHaveCount(1);
        await expect(roles.level('Data editor')).toHaveText(LEVEL.assistant);
        const states = await roles.boxStates('Data editor');
        for (const stage of STAGES) {
            expect(states[stage].checked, `Data editor ${stage}`).toBe(stage === C);
        }

        // "Invite to a role" offers it (Side effects).
        const offered = await inviteRoleOptions(mp, tag, `invitee-${tag}@mail.test`);
        expect(offered).toContain('Data editor');
        expect(offered).toContain('Copyeditor');

        // Its "Edit" (Rules 13, 14), then "Cancel" (Rule 17).
        await roles.goto();
        win = await roles.openEdit('Data editor');
        await expect(win.title).toHaveText('Edit');
        await expect(win.nameBox()).toHaveValue('Data editor');
        await expect(win.abbrevBox()).toHaveValue('DE');
        for (const stage of STAGES) {
            if (stage === C) {
                await expect(win.stageBox(stage)).toBeChecked();
            } else {
                await expect(win.stageBox(stage), stage).not.toBeChecked();
            }
        }
        await expect(win.optionBox(OPT.metadata)).toBeChecked();
        await expect(win.optionBox(OPT.selfReg)).not.toBeChecked();
        expect(await win.levelLabel()).toBe(LEVEL.assistant);
        await expect(win.level).toBeDisabled();
        await win.cancel();

        // Control: "Create New Role" again keeps nothing of "Data editor" (Rule 12).
        win = await roles.openCreate();
        expect(await win.levelLabel()).toBe(LEVEL.manager);
        await expect(win.nameBox()).toHaveValue('');
        await expect(win.abbrevBox()).toHaveValue('');
        await win.cancel();
    }));

    test('S4: rename a role', async ({asUser, ojsApi}, testInfo) => replayWhenFirstRow(testInfo, async () => {
        test.slow();
        const tag = makeTag(4, testInfo);
        const manager = managerEntry(tag);
        const quinn = `q${tag}`;
        await ojsApi.createContext({
            tag,
            users: [
                manager,
                {username: quinn, givenName: 'Quinn', familyName: 'Ashdown', roles: ['editorialBoardMember']},
            ],
        });
        const mp = await signedIn(asUser, manager.username);
        const roles = new RolesTab(mp, tag, {stages: STAGES});
        const EBM = 'Editorial Board Member';

        // Its "Edit" (Rule 14; the roles table).
        await roles.goto();
        const win = await roles.openEdit(EBM);
        await expect(win.title).toHaveText('Edit');
        await expect(win.nameBox()).toHaveValue(EBM);
        for (const stage of STAGES) {
            await expect(win.stageBox(stage), stage).not.toBeChecked();
        }
        await expect(win.optionBox(OPT.masthead)).toBeChecked();
        expect(await win.levelLabel()).toBe(LEVEL.assistant);
        await expect(win.level).toBeDisabled();

        // Renamed (Rule 15a).
        await win.nameBox().fill('Advisory Board');
        const saved = await win.save();
        expect(saved.status()).toBe(200);
        await expect(roles.notice(SAVED)).toBeVisible();
        await expect(roles.row('Advisory Board')).toHaveCount(1);
        await expect(roles.row(EBM)).toHaveCount(0);

        // The "Users" list (Side effects; Rule 22), read after a reload: the
        // tab opened on the same page still lists the old name (finding
        // T-ojs-1, test-ojs-findings.md).
        await mp.reload();
        await roles.usersTab.click();
        const users = new UsersListPage(mp, tag);
        const quinnRow = users.row(`${quinn}@mail.test`);
        await expect(users.rolesCell(quinnRow)).toHaveText('Advisory Board');

        // Control: "Invite to a role" offers the new name, not the old (Rule 22).
        const offered = await inviteRoleOptions(mp, tag, `invitee-${tag}@mail.test`);
        expect(offered).toContain('Advisory Board');
        expect(offered).not.toContain(EBM);
    }));

    test('S5: the Settings box of a manager\'s only Settings role', async ({asUser, ojsApi}, testInfo) => replayWhenFirstRow(testInfo, async () => {
        test.slow();
        const tag = makeTag(5, testInfo);
        const manager = managerEntry(tag);
        const kai = `k${tag}`;
        const lena = `l${tag}`;
        await ojsApi.createContext({
            tag,
            customRoles: [{key: 'managingEditor', level: 'manager', name: 'Managing editor', abbrev: 'MGE'}],
            users: [
                manager,
                {username: kai, givenName: 'Kai', familyName: 'Moreno', roles: ['managingEditor']},
                {username: lena, givenName: 'Lena', familyName: 'Ortiz', roles: ['editor']},
            ],
        });
        const ME = 'Managing editor';

        // "Managing editor" for the Journal Manager (Rules 12, 14, 15a, 18).
        const mp = await signedIn(asUser, manager.username);
        const roles = new RolesTab(mp, tag, {stages: STAGES});
        await roles.goto();
        let win = await roles.openEdit(ME);
        await expect(win.title).toHaveText('Edit');
        expect(await win.levelLabel()).toBe(LEVEL.manager);
        await expect(win.level).toBeDisabled();
        await expect(win.optionBox(OPT.settings)).not.toBeChecked();
        await expect(win.optionBox(OPT.settings)).toBeEnabled();
        await win.optionBox(OPT.settings).check();
        const saved = await win.save();
        expect(saved.status()).toBe(200);
        await expect(roles.notice(SAVED)).toBeVisible();

        // Kai, in the second browser: the page opens; the box ticked and greyed.
        const kp = await signedIn(asUser, kai);
        const kaiRoles = new RolesTab(kp, tag, {stages: STAGES});
        await kp.goto(kaiRoles.url());
        await expect(kaiRoles.pageHeading).toHaveText('Users & Roles');
        await kaiRoles.openTab();
        win = await kaiRoles.openEdit(ME);
        await expect(win.optionBox(OPT.settings)).toBeChecked();
        await expect(win.optionBox(OPT.settings)).toBeDisabled();
        await win.cancel();

        // Lena, the Editor: her own role's box greyed, another's open.
        const lp = await signedIn(asUser, lena);
        const lenaRoles = new RolesTab(lp, tag, {stages: STAGES});
        await lenaRoles.goto();
        win = await lenaRoles.openEdit('Journal editor');
        await expect(win.optionBox(OPT.settings)).toBeChecked();
        await expect(win.optionBox(OPT.settings)).toBeDisabled();
        await win.cancel();
        win = await lenaRoles.openEdit('Production editor');
        await expect(win.optionBox(OPT.settings)).toBeChecked();
        await expect(win.optionBox(OPT.settings)).toBeEnabled();
        await win.cancel();

        // Control: the Journal Manager's "Edit" of "Managing editor": ticked and open.
        await roles.goto();
        win = await roles.openEdit(ME);
        await expect(win.optionBox(OPT.settings)).toBeChecked();
        await expect(win.optionBox(OPT.settings)).toBeEnabled();
        await win.cancel();
    }));

    test('S6: remove a role', async ({asUser, ojsApi}, testInfo) => replayWhenFirstRow(testInfo, async () => {
        test.slow();
        const tag = makeTag(6, testInfo);
        const manager = managerEntry(tag);
        const quinn = `q${tag}`;
        const nova = `n${tag}`;
        await ojsApi.createContext({
            tag,
            customRoles: [
                {key: 'spareDesk', level: 'assistant', name: 'Spare desk', abbrev: 'SD'},
                {key: 'dataCurator', level: 'assistant', name: 'Data curator', abbrev: 'DC', stages: ['copyediting']},
                {key: 'archiveDesk', level: 'assistant', name: 'Archive desk', abbrev: 'AD'},
            ],
            users: [
                manager,
                {username: quinn, givenName: 'Quinn', familyName: 'Ashdown', roles: ['dataCurator']},
                {username: nova, givenName: 'Nova', familyName: 'Reyes', roles: [], pastRoles: [{role: 'archiveDesk'}]},
            ],
        });
        const mp = await signedIn(asUser, manager.username);
        const roles = new RolesTab(mp, tag, {stages: STAGES});

        // The confirmation (Rule 20).
        await roles.goto();
        let confirm = await roles.openRemove('Spare desk');
        await expect(confirm.dialog.getByText('Confirm', {exact: true})).toBeVisible();
        await expect(confirm.dialog).toContainText(REMOVE_SENTENCE);
        expect(await confirm.buttonLabels()).toEqual(expect.arrayContaining(['OK', 'Cancel']));

        // Removed (Rule 21); the list read after a reload (A5).
        let answer = await confirm.ok();
        expect(answer.status()).toBe(200);
        await expect(roles.notice('Spare desk role removed.')).toBeVisible();
        await roles.reload();
        await expect(roles.row('Data curator')).toHaveCount(1);
        await expect(roles.row('Spare desk')).toHaveCount(0);

        // "Invite to a role" (Side effects).
        const offered = await inviteRoleOptions(mp, tag, `invitee-${tag}@mail.test`);
        expect(offered).toContain('Data curator');
        expect(offered).not.toContain('Spare desk');

        // A role someone holds (Rule 21).
        await roles.goto();
        confirm = await roles.openRemove('Data curator');
        answer = await confirm.ok();
        expect(answer.status()).toBe(200);
        await expect(roles.notice("Can't remove Data curator role. Currently 1 user(s) is/are assigned to it.")).toBeVisible();

        // A role whose member has left it (Rule 21).
        confirm = await roles.openRemove('Archive desk');
        answer = await confirm.ok();
        expect(answer.status()).toBe(200);
        await expect(roles.notice("Can't remove Archive desk role. Currently 1 user(s) is/are assigned to it.")).toBeVisible();

        // A role the journal was created with (Rule 21).
        confirm = await roles.openRemove('Editorial Board Member');
        answer = await confirm.ok();
        expect(answer.status()).toBe(200);
        await expect(
            roles.notice("The role Editorial Board Member is a default one and can't be removed.")
        ).toBeVisible();

        // Control: all three still listed after a reload (Rule 21).
        await roles.reload();
        for (const name of ['Data curator', 'Archive desk', 'Editorial Board Member']) {
            await expect(roles.row(name), name).toHaveCount(1);
        }
    }));

    test('S7: require sign-in, then close registration', async ({asUser, ojsApi, browser, baseURL}, testInfo) => {
        test.slow();
        const tag = makeTag(7, testInfo);
        const manager = managerEntry(tag);
        await ojsApi.createContext({tag, users: [manager]});
        const home = `/index.php/${tag}`;

        // The signed-out visitor, on the journal's home page.
        const visitorContext = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
        const vp = await visitorContext.newPage();
        await vp.goto(home);
        await expect(siteHeader(vp).getByRole('link', {name: 'Register', exact: true})).toBeVisible();

        // The tab (Fields, the "Site Access Options" tab).
        const mp = await signedIn(asUser, manager.username);
        const access = new SiteAccessTab(mp, tag);
        await access.goto();
        await expect(access.group(SITE.siteGroup).getByRole('checkbox', {name: SITE.siteBox, exact: true})).not.toBeChecked();
        await expect(
            access.group(SITE.contentGroup).getByRole('checkbox', {name: SITE.contentBox, exact: true})
        ).not.toBeChecked();
        await expect(access.group(SITE.registrationGroup).getByRole('radio', {name: SITE.open, exact: true})).toBeChecked();
        await expect(access.group(SITE.registrationGroup).getByRole('radio', {name: SITE.closed, exact: true})).not.toBeChecked();
        await expect(access.saveButton).toBeVisible();

        // Sign-in required (Rule 23).
        await access.box(SITE.siteBox).check();
        expect((await access.save()).status()).toBe(200);

        // The visitor: the Login page; its "Register" opens the form (Rule 24).
        await vp.reload();
        await expect(vp.locator('form#login')).toBeVisible();
        await loginFormRegisterLink(vp).click();
        await expect(vp.locator('form#register')).toBeVisible();
        const registerUrl = vp.url();
        expect(new URL(registerUrl).pathname).toMatch(/\/user\/register$/);

        // Registration closed (Rule 23).
        await access.box(SITE.siteBox).uncheck();
        await access.radio(SITE.closed).check();
        expect((await access.save()).status()).toBe(200);

        // The visitor: home opens with no "Register"; Login has none either;
        // the Register page shows no form (Rule 24).
        await vp.goto(home);
        const headerLogin = siteHeader(vp).getByRole('link', {name: 'Login', exact: true});
        await expect(headerLogin).toBeVisible();
        await expect(vp.locator('form#login')).toHaveCount(0);
        await expect(siteHeader(vp).getByRole('link', {name: 'Register', exact: true})).toHaveCount(0);
        await headerLogin.click();
        await expect(vp.locator('form#login')).toBeVisible();
        await expect(loginFormRegisterLink(vp)).toHaveCount(0);
        await expect(siteHeader(vp).getByRole('link', {name: 'Register', exact: true})).toHaveCount(0);
        await vp.goto(registerUrl);
        await expect(vp.getByText(SITE.closedMessage)).toBeVisible();
        await expect(vp.locator('form#register')).toHaveCount(0);
        await expect(vp.locator('.pkp_structure_main').getByRole('link', {name: 'Login', exact: true})).toBeVisible();

        // Registration reopened (Rule 24).
        await access.radio(SITE.open).check();
        expect((await access.save()).status()).toBe(200);
        await vp.goto(home);
        const headerRegister = siteHeader(vp).getByRole('link', {name: 'Register', exact: true});
        await expect(headerRegister).toBeVisible();
        await headerRegister.click();
        await expect(vp.locator('form#register')).toBeVisible();

        // Control: the values saved last (Rule 23).
        await access.reload();
        await expect(access.box(SITE.siteBox)).not.toBeChecked();
        await expect(access.box(SITE.contentBox)).not.toBeChecked();
        await expect(access.radio(SITE.open)).toBeChecked();
        await expect(access.radio(SITE.closed)).not.toBeChecked();
        await visitorContext.close();
    });
});
