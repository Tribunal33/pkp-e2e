// @ts-check
/**
 * @file playwright/tests/U56-emails-management.spec.js
 *
 * Emails management — OMP suite, one test per canonical scenario the spec
 * runs on OMP (scenarios 1–5, all common), in OMP vocabulary (press, Press
 * Manager, Series Editor, "Validate Email (Press Registration)").
 * Spec: docs/specs/U56-emails-management.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A1 🐞,
 * A2 🐞, A4 🐞, A5 🐞, OMP1 🐞, OMP2 🐞, A6 ❓, A8 ❓, and Submission wizard
 * A12 🐞 (U21). Where a test passes through one it leaves the finding's own
 * claim unasserted either way: S1 reads the list's order without the three
 * ORCID rows (A2) and reads "Sent From" › "Reader" marked and unmarked but
 * not the list it leaves (A8); S2 reads the "Editorial statistics"
 * description up to its last words (A1), not which "Notify Primary
 * Contact" choice is selected (OMP2), and not the "Submission
 * Confirmation" choices after "Do not send an email." is saved (A12); S3
 * finds the "Add Template" window as "Edit Template" or "Add Template"
 * (A4) and reads the "Remove Template" sentence up to the template's name
 * (A5); S4 reads the one-template window's "Save" and not whether it
 * offers anything else (A6). No test presses "Edit" on "User Role
 * Masthead Visibility Update Notification" (OMP1: the page stays frozen
 * behind a spinner until a reload). The short full-screen spinner before a
 * window opens is a transient no test reads. The spec's Coverage section
 * records everything else left out.
 *
 * Seeding (footnote s): scenario 1 reads `publicknowledge` only, as
 * `manager.maya` and `sectioneditor.ana` (the Series Editor); scenarios
 * 2–5 each run on their own scratch press from `POST scenarios/context`
 * with a throwaway Press Manager (scenario 4 adds a throwaway Author and
 * two drafts, whose manuscript the Author uploads in the wizard's first
 * step as every OMP wizard walk does; scenario 5 the forms in English and
 * French through `supportedFormLocales`), and scenarios 3 and 5 read
 * `publicknowledge` as `manager.maya` in a second browser. Every actor is
 * opened through `asUser` (no default user: a multi-actor test sets none,
 * patterns.md "Fixture selection"). Scenario 4's confirmations are read
 * in Mailpit by the Author's throwaway address (PRINCIPLES A8); the
 * submission confirmation is sent by the wizard's submit itself, so no
 * job queue is drained and the suite runs in the parallel project.
 */
const {test, expect} = require('../support/fixtures.js');
const {wizardUrl, expectWizardOpen, completeAndSubmitDraft} = require('../pages/SubmissionWizardPages.js');
const {
    ManageEmailsPage,
    WorkflowEmailsSettingsPage,
    isRedLettering,
} = require('../../../../shared/playwright/pages/EmailsPages.js');

const SEEDED = 'publicknowledge';
const LIST_COUNT = 56;
const REGISTRATION_EMAIL = 'Validate Email (Press Registration)';
const ACK_EMAIL = 'Submission Confirmation';
const ACCESS_DENIED = 'The current role does not have access to this operation.';
const FILTER_BLOCKS = [
    {heading: null, buttons: ['Submission', 'Review', 'Copyediting', 'Production', 'Other']},
    {heading: 'Sent From', buttons: ['Editor', 'Reviewer', 'Assistant', 'Reader', 'System']},
    {heading: 'Sent To', buttons: ['Editor', 'Reviewer', 'Assistant', 'Author', 'Reader']},
];
const WINDOW_EXPLANATION =
    'Add and edit templates that you would like to make available to the user when they are sending this email. ' +
    'The default will be loaded automatically, and the user will be able to quickly load any other templates you add here.';
const REQUIRED = 'This field is required.';
const RESET_ALL_SENTENCE =
    'If you reset all templates, all modifications to the email templates will be lost. Do you want to confirm this operation?';

/**
 * The "Emails" tab's text at the install defaults, line by line; CONTACT
 * stands for the principal contact line, STATS for the "Editorial
 * statistics" description (A1, read up to its last words).
 */
const CONTACT = Symbol('contact');
const STATS = Symbol('stats');
const STATS_PREFIX = 'Whether or not to send a monthly email to editors with the editorial statistics of the';
const TAB_LINES = [
    'Manage Emails',
    'Edit the messages sent in emails from this press.',
    'Email Templates',
    'Add and edit templates for all of the emails sent by the system.',
    'Signature',
    'Emails sent automatically on behalf of the press will have the following signature added.',
    'Insert Content',
    'New Submission',
    'Configure the email notifications to send when a new submission is made.',
    'Submission Confirmation',
    'Who should receive an email when a new submission is completed.',
    'Send an email to all authors.',
    'Send an email to the submitting author only.',
    'Do not send an email.',
    'Notify Primary Contact',
    "Send a copy of the submission acknowledgement email to this press's primary contact.",
    CONTACT,
    'No',
    'Notify Anyone',
    'A copy of the submission acknowledgement email will be sent to any of the email addresses entered here. ' +
        'Separate multiple email addresses with a comma. Example: one@example.com,two@example.com',
    'Editorial Decisions',
    'Configure the email notifications to send to authors when an editorial decision is recorded.',
    'Notify All Authors',
    'Who should receive a notification email when an editorial decision is recorded?',
    'Send an email notification to all authors of the submission.',
    'Only send an email to authors assigned to the submission workflow. Usually, this is the submitting author.',
    'For Editors',
    'Configure the email notifications to send to editors.',
    'Editorial statistics',
    STATS,
    'Send a monthly email to editors.',
    'Do not send the email to editors.',
    'Advanced',
    'Bounce Address',
    'In order to send undeliverable emails to a bounce address, the site administrator must enable the ' +
        'allow_envelope_sender option in the site configuration file. Server configuration may be required, as ' +
        'indicated in the OMP documentation.',
    'Save',
];

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u56s${scenario}ompw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account of the scratch press, named by the tag. */
function person(tag, key, givenName, familyName, roles) {
    return {username: `${tag}${key}`, givenName, familyName, email: `${tag}${key}@mail.test`, roles};
}

/** A scratch press with a throwaway Press Manager (and `extraUsers`); returns the manager's username. */
async function seedScratchPress(ompApi, tag, {context, extraUsers = []} = {}) {
    const manager = person(tag, 'mg', 'Mona', 'Manager', ['manager']);
    const spec = {tag, users: [manager, ...extraUsers]};
    if (context) {
        spec.context = context;
    }
    await ompApi.createContext(spec);
    return manager.username;
}

/** A signed-in page for an actor (a fresh `asUser` context). */
async function signedIn(asUser, username) {
    const context = await asUser(username);
    return context.newPage();
}

/** Text without tags, whitespace folded. */
const plain = (html) =>
    html
        .replace(/<\/p>|<br\s*\/?>/g, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

test.describe('emails management', () => {
    test('S1: the seeded press\'s email list: search, filters, and who may open it', async ({asUser}) => {
        test.slow();
        const mp = await signedIn(asUser, 'manager.maya');

        // The way in (Fields, both screens).
        const tab = new WorkflowEmailsSettingsPage(mp, SEEDED);
        await tab.goto();
        const lines = await tab.lines();
        expect(lines.slice(0, 4)).toEqual([
            'Manage Emails',
            'Edit the messages sent in emails from this press.',
            'Email Templates',
            'Add and edit templates for all of the emails sent by the system.',
        ]);
        await expect(tab.manageEmailsLink()).toHaveText('Add and edit templates');
        const manage = await tab.openManageEmails();
        await expect(mp).toHaveURL(/\/management\/settings\/manageEmails/);
        await expect(manage.pageHeading()).toBeVisible();
        await expect(manage.listHeading()).toBeVisible();
        await expect(mp.getByRole('searchbox', {name: 'Search by name or description'})).toBeVisible();
        await expect(manage.resetAllButton()).toBeVisible();
        expect(await isRedLettering(manage.resetAllButton()), '"Reset All" in red lettering').toBe(true);
        await expect(manage.filtersHeading()).toBeVisible();

        // The list (Rule 6): 56 rows, sorted by name, each a bold name, a
        // description and an "Edit".
        await expect(manage.rows()).toHaveCount(LIST_COUNT);
        const rows = await manage.rowsRead();
        for (const row of rows) {
            expect(row.name, 'every row has a name').toBeTruthy();
            expect(row.description, `"${row.name}" has a description`).toBeTruthy();
            expect(row.bold, `"${row.name}" in bold`).toBe(true);
        }
        await expect(manage.list.getByRole('button', {name: /^Edit /})).toHaveCount(LIST_COUNT);
        await expect(manage.editButton(REGISTRATION_EMAIL)).toHaveCount(1);
        const names = rows.map((r) => r.name);
        const byName = names.filter((n) => !/^orcid/.test(n));
        expect(byName, 'sorted by name').toEqual([...byName].sort());
        expect(names).toEqual(expect.arrayContaining([REGISTRATION_EMAIL, 'Sent to Internal Review']));

        // Search (Rule 7): nothing before Enter, then the rows holding the
        // words; a phrase nothing holds; the "×".
        await manage.typeSearch('submission declined');
        await expect(manage.searchBox()).toHaveValue('submission declined');
        await expect(manage.rows()).toHaveCount(LIST_COUNT);
        await manage.searchBox().press('Enter');
        await expect(manage.rows()).not.toHaveCount(LIST_COUNT);
        const found = await manage.rowsRead();
        expect(found.map((r) => r.name)).toEqual(expect.arrayContaining(['Submission Declined', 'Submission Declined (Pre-Review)']));
        for (const row of found) {
            expect(`${row.name} ${row.description}`.toLowerCase(), `"${row.name}" holds the words`).toContain('submission declined');
        }
        await manage.search('Zebra crossing');
        await expect(manage.noItems()).toBeVisible();
        await expect(manage.rows()).toHaveCount(0);
        await manage.clearSearchButton().click();
        await expect(manage.rows()).toHaveCount(LIST_COUNT);
        await expect(manage.searchBox()).toHaveValue('');

        // The filter buttons, in order (Rule 8).
        expect(await manage.filterBlocks()).toEqual(FILTER_BLOCKS);

        // "Sent From" › "Reader": marked with its "×" (the list it leaves is
        // A8's, unread); pressed again, the whole list (Rule 8).
        const reader = manage.filterButton('Reader', 0);
        await reader.click();
        await expect(reader).toHaveClass(/-isActive/);
        await expect(manage.filterRemove('Reader')).toBeVisible();
        await expect(manage.markedFilters()).toHaveText(['Reader']);
        await reader.click();
        await expect(reader).not.toHaveClass(/-isActive/);
        await expect(manage.filterRemove('Reader')).toHaveCount(0);
        await expect(manage.rows()).toHaveCount(LIST_COUNT);

        // "Submission": marked, fewer rows; its "×" unmarks it (Rule 8).
        const submission = manage.filterButton('Submission');
        await submission.click();
        await expect(submission).toHaveClass(/-isActive/);
        await expect(manage.rows()).not.toHaveCount(LIST_COUNT);
        expect(await manage.rows().count()).toBeGreaterThan(0);
        await manage.filterRemove('Submission').click();
        await expect(submission).not.toHaveClass(/-isActive/);
        await expect(manage.markedFilters()).toHaveCount(0);
        await expect(manage.rows()).toHaveCount(LIST_COUNT);

        // Forgotten on reload (Rule 8).
        await submission.click();
        await expect(submission).toHaveClass(/-isActive/);
        await manage.search('submission declined');
        await expect(manage.rows()).not.toHaveCount(LIST_COUNT);
        await manage.reload();
        await expect(manage.rows()).toHaveCount(LIST_COUNT);
        await expect(manage.markedFilters()).toHaveCount(0);
        await expect(manage.filterButton('Submission')).not.toHaveClass(/-isActive/);
        await expect(manage.searchBox()).toHaveValue('');

        // The Series Editor, at the two addresses the Press Manager's
        // browser shows (Actors row 1).
        const tabAddress = tab.url();
        const manageAddress = manage.url();
        const sp = await signedIn(asUser, 'sectioneditor.ana');
        for (const address of [tabAddress, manageAddress]) {
            await sp.goto(address);
            await expect(sp.getByText(ACCESS_DENIED, {exact: true})).toBeVisible();
            await expect(sp.locator('#emails')).toHaveCount(0);
            await expect(sp.locator('.manageEmails__listPanel')).toHaveCount(0);
        }

        // Control: the Press Manager at the same two addresses.
        await mp.goto(tabAddress);
        await tab.openTab();
        await expect(tab.manageEmailsLink()).toBeVisible();
        await expect(mp.getByText(ACCESS_DENIED)).toHaveCount(0);
        await manage.goto();
        await expect(manage.rows()).toHaveCount(LIST_COUNT);
    });

    test('S2: save the "Emails" tab, and the rows its choices take off the list', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag(2, testInfo);
        const manager = await seedScratchPress(ompApi, tag);
        const mp = await signedIn(asUser, manager);
        const tab = new WorkflowEmailsSettingsPage(mp, tag);

        // The tab at its defaults (Fields, the "Emails" tab; Rule 5).
        await tab.goto();
        await expect(tab.pageHeading).toHaveText('Workflow Settings');
        const lines = await tab.lines();
        const contactLine = lines.find((l) => l.startsWith('Yes, send a copy to'));
        expect(contactLine).toMatch(/^Yes, send a copy to \S+@\S+$/);
        const statsLine = lines.find((l) => l.startsWith(STATS_PREFIX));
        expect(statsLine, 'the "Editorial statistics" description').toBeTruthy();
        expect(lines).toEqual(TAB_LINES.map((l) => (l === CONTACT ? contactLine : l === STATS ? statsLine : l)));
        await expect(tab.saveButton()).toHaveCount(1);
        expect(await tab.checkedValue('submissionAcknowledgement')).toBe('allAuthors');
        await expect(tab.radios('copySubmissionAckPrimaryContact')).toHaveCount(2);
        await expect(tab.notifyAnyoneBox()).toHaveValue('');
        expect(await tab.checkedValue('notifyAllAuthors')).toBe('true');
        expect(await tab.checkedValue('editorialStatsEmail')).toBe('true');
        await expect(tab.panel.locator('input[name="envelopeSender"]')).toHaveCount(0);

        // A one-template email edited (Rules 9, 11).
        let manage = await tab.openManageEmails();
        const stats = await manage.openEmail('Statistics Report Notification');
        expect(stats.kind).toBe('one');
        await manage.subjectBox().fill('Monthly figures');
        await manage.saveTemplate();

        // A bad address refused (Rule 1; Fields, the "Emails" tab).
        await tab.goto();
        await tab.choose('editorialStatsEmail', 'false');
        await tab.notifyAnyoneBox().fill('not-an-email');
        expect(await tab.pressSave()).toBe(400);
        await expect(tab.fieldError('copySubmissionAckAddress')).toHaveText(
            /^\s*This is not a valid email address\.\s*One or more of these email addresses is not valid\.\s*$/
        );
        await expect(tab.footer()).toContainText('Please correct one error.');
        await expect(tab.savedStatus()).toHaveCount(0);
        await tab.goto();
        expect(await tab.checkedValue('editorialStatsEmail')).toBe('true');
        await expect(tab.notifyAnyoneBox()).toHaveValue('');

        // A change left unsaved (Rule 1).
        await tab.choose('editorialStatsEmail', 'false');
        await tab.tab('Tasks and Discussions').click();
        await expect(tab.panel).toBeHidden();
        await tab.openTab();
        expect(await tab.checkedValue('editorialStatsEmail')).toBe('false');
        const asked = [];
        mp.on('dialog', async (d) => {
            asked.push(d.type());
            await d.accept();
        });
        await mp.goto(tab.contextUrl(tag, '/management/settings/context'));
        await expect(mp).toHaveURL(/\/management\/settings\/context/);
        expect(asked, 'nothing asks before leaving').toEqual([]);
        await tab.goto();
        expect(await tab.checkedValue('editorialStatsEmail')).toBe('true');

        // Choices saved (Rule 1).
        await tab.choose('submissionAcknowledgement', 'submittingAuthor');
        await tab.choose('notifyAllAuthors', 'false');
        await tab.choose('editorialStatsEmail', 'false');
        await tab.save();
        await tab.goto();
        expect(await tab.checkedValue('submissionAcknowledgement')).toBe('submittingAuthor');
        expect(await tab.checkedValue('notifyAllAuthors')).toBe('false');
        expect(await tab.checkedValue('editorialStatsEmail')).toBe('false');

        // The rows they take off (Rule 3), each searched with Enter; the
        // confirmation keeps its row.
        manage = await tab.openManageEmails();
        for (const name of ['Submission Confirmation (Other Authors)', 'Notify Other Authors', 'Statistics Report Notification']) {
            await manage.search(name);
            await expect(manage.rows()).not.toHaveCount(LIST_COUNT);
            await expect(manage.mailableRow(name)).toHaveCount(0);
        }
        await manage.search(ACK_EMAIL);
        await expect(manage.mailableRow(ACK_EMAIL)).toHaveCount(1);

        // No confirmation at all (Rules 3, 4): the copy fields go before
        // any "Save"; both confirmation rows leave the list.
        await tab.goto();
        await expect(tab.radios('copySubmissionAckPrimaryContact').first()).toBeVisible();
        await expect(tab.notifyAnyoneBox()).toBeVisible();
        await tab.radioByLabel('Do not send an email.').check();
        await expect(tab.radios('copySubmissionAckPrimaryContact')).toHaveCount(0);
        await expect(tab.notifyAnyoneBox()).toHaveCount(0);
        await expect(tab.radios('notifyAllAuthors').first()).toBeVisible();
        await tab.save();
        manage = await tab.openManageEmails();
        await manage.search(ACK_EMAIL);
        await expect(manage.rows()).not.toHaveCount(LIST_COUNT);
        await expect(manage.mailableRow(ACK_EMAIL)).toHaveCount(0);
        await expect(manage.mailableRow('Submission Confirmation (Other Authors)')).toHaveCount(0);

        // The choices set back (Rule 3): every row back, the edited
        // template as saved.
        await tab.goto();
        await tab.choose('submissionAcknowledgement', 'allAuthors');
        await tab.choose('notifyAllAuthors', 'true');
        await tab.choose('editorialStatsEmail', 'true');
        await tab.save();
        manage = await tab.openManageEmails();
        for (const name of [ACK_EMAIL, 'Submission Confirmation (Other Authors)', 'Notify Other Authors', 'Statistics Report Notification']) {
            await expect(manage.mailableRow(name), `"${name}" is listed again`).toHaveCount(1);
        }
        // Control: the whole list, as with the tab at its defaults (Rule 6).
        await expect(manage.rows()).toHaveCount(LIST_COUNT);
        const reopened = await manage.openEmail('Statistics Report Notification');
        expect(reopened.kind).toBe('one');
        await expect(manage.subjectBox()).toHaveValue('Monthly figures');
    });

    test('S3: edit, add, reset and remove the templates of an email', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag(3, testInfo);
        const manager = await seedScratchPress(ompApi, tag);
        const mp = await signedIn(asUser, manager);
        const tab = new WorkflowEmailsSettingsPage(mp, tag);
        const EMAIL = 'Submission Declined';

        // The email's window (Rules 9, 10; Fields, the email's window).
        await tab.goto();
        const manage = await tab.openManageEmails();
        await manage.search(EMAIL);
        await expect(manage.mailableRow(EMAIL)).toHaveCount(1);
        const description = (await manage.rowsRead()).find((r) => r.name === EMAIL)?.description;
        const opened = await manage.openEmail(EMAIL, {search: false});
        expect(opened.kind).toBe('several');
        const win = opened.window;
        await expect(win.getByRole('heading', {name: EMAIL, exact: true})).toBeVisible();
        const box = await win.getByRole('heading', {name: 'Templates', exact: true}).boundingBox();
        const viewport = mp.viewportSize();
        expect(box && viewport && box.x > viewport.width / 20, 'the window sits over the right of the page').toBe(true);
        expect(await manage.windowParagraphs(win)).toEqual([description, WINDOW_EXPLANATION]);
        await expect(manage.templatesHeading(win)).toBeVisible();
        await expect(manage.addTemplateButton(win)).toBeVisible();
        const installed = await manage.templateRowsRead(win);
        expect(installed).toHaveLength(1);
        expect(installed[0].badges).toEqual(['Default']);
        expect(installed[0].buttons).toEqual(['Edit']);
        const installedName = installed[0].name;
        expect(installedName).toBeTruthy();

        // The default edited (Rules 10, 11).
        await manage.openTemplate(win, installedName);
        await expect(manage.nameBox()).toHaveValue(installedName);
        const installedSubject = await manage.subjectBox().inputValue();
        expect(installedSubject).toBeTruthy();
        expect(plain(await manage.bodyHtml())).not.toBe('');
        await manage.nameBox().fill('Decline, edited');
        await manage.subjectBox().fill('About your submission');
        await manage.typeBody('We cannot take your submission further.');
        await manage.saveTemplate();
        expect(await manage.templateRowsRead(win)).toEqual([{name: 'Decline, edited', badges: ['Default'], buttons: ['Edit', 'Reset']}]);

        // The seeded press's Press Manager keeps its own text (Rule 11).
        const sp = await signedIn(asUser, 'manager.maya');
        const seeded = new ManageEmailsPage(sp, SEEDED);
        await seeded.goto();
        const seededOpened = await seeded.openEmail(EMAIL);
        expect(await seeded.templateRowsRead(seededOpened.window)).toEqual([
            {name: installedName, badges: ['Default'], buttons: ['Edit']},
        ]);
        await seeded.openTemplate(seededOpened.window, installedName);
        await expect(seeded.subjectBox()).toHaveValue(installedSubject);
        await seeded.closeWindow(seeded.templateWindow());

        // A save refused (Rule 13).
        const addForm = await manage.openAddTemplate(win);
        await expect(manage.nameBox()).toHaveValue('');
        await expect(manage.subjectBox()).toHaveValue('');
        expect(plain(await manage.bodyHtml())).toBe('');
        const refused = await manage.pressTemplateSave();
        expect(refused.status).toBe(400);
        await expect(addForm).toBeVisible();
        for (const field of ['name', 'subject', 'body']) {
            await expect(manage.templateFieldError(field), `the message under "${field}"`).toHaveText(REQUIRED);
        }
        await expect(manage.templateFooter()).toContainText('Please correct 3 errors.');
        await expect(manage.jumpToErrorButton()).toBeVisible();
        await expect(manage.templateSaveButton()).toBeDisabled();
        await manage.nameBox().fill('Short decline');
        await expect(manage.templateFieldError('name')).toHaveCount(0);
        await expect(manage.templateFieldError('subject')).toHaveText(REQUIRED);
        await expect(manage.templateSaveButton()).toBeDisabled();
        await manage.subjectBox().fill('A short decline');
        await expect(manage.templateFieldError('subject')).toHaveCount(0);
        await expect(manage.templateFieldError('body')).toHaveText(REQUIRED);
        await expect(manage.templateSaveButton()).toBeDisabled();
        await manage.typeBody('Dear');
        await expect(manage.templateSaveButton()).toBeEnabled();

        // "Insert Content" (Rule 14).
        const insert = await manage.openInsertContent();
        const placeholders = await manage.insertContentRows(insert);
        expect(placeholders.length).toBeGreaterThan(0);
        for (const row of placeholders) {
            expect(row.value, 'each placeholder shown as written').toMatch(/^\{\$\w+\}$/);
            expect(row.description, `${row.value} has a description`).toBeTruthy();
            expect(row.insert, `${row.value} has "Insert"`).toBe(true);
        }
        expect(placeholders.map((r) => r.value)).toContain('{$recipientName}');
        await manage.insertPlaceholder(insert, '{$recipientName}');
        await expect(insert).toBeHidden();
        expect(await manage.bodyHtml()).toMatch(/Dear\s*\{\$recipientName\}/);
        const tagText = manage.bodyFrame().locator('.pkpTag, [data-symbolic], .mceNonEditable').filter({hasText: /recipientName/i});
        await expect(tagText).toHaveCount(1);
        expect(await tagText.evaluate((el) => getComputedStyle(el).textTransform)).toBe('uppercase');

        // The template added (Rules 10, 12).
        await manage.saveTemplate();
        expect(await manage.templateRowsRead(win)).toEqual([
            {name: 'Decline, edited', badges: ['Default'], buttons: ['Edit', 'Reset']},
            {name: 'Short decline', badges: [], buttons: ['Edit', 'Remove']},
        ]);
        const rowsSaved = await manage.templateRowsRead(win);

        // Closed without saving (Rule 15).
        await manage.openTemplate(win, 'Short decline');
        await manage.subjectBox().fill('Unsaved subject');
        const asked = [];
        mp.on('dialog', async (d) => {
            asked.push(d.type());
            await d.accept();
        });
        // lint-ok: escape Rule 15 claims the key; "Edit Template" is the top layer and closes alone
        await mp.keyboard.press('Escape');
        await expect(manage.templateWindow()).toBeHidden();
        await expect(win).toBeVisible();
        expect(await manage.templateRowsRead(win)).toEqual(rowsSaved);
        await manage.openTemplate(win, 'Short decline');
        await expect(manage.subjectBox()).toHaveValue('Unsaved subject');
        await manage.closeWindow(manage.templateWindow());
        await manage.openTemplate(win, 'Decline, edited');
        await manage.closeWindow(manage.templateWindow());
        await manage.openTemplate(win, 'Short decline');
        await expect(manage.subjectBox()).toHaveValue('A short decline');
        await manage.closeWindow(manage.templateWindow());
        expect(asked, 'nothing asks on closing').toEqual([]);

        // "Reset" (Rule 16): "Cancel" changes nothing; confirmed, the
        // installed name, subject and body, and no "Reset".
        const resetConfirm = manage.confirmation('Reset Template');
        await manage.rowButton(manage.templateRow(win, 'Decline, edited'), 'Reset').click();
        await expect(resetConfirm).toContainText(
            `Are you sure you want to reset the subject and body to their defaults for the template ${EMAIL}?`
        );
        expect(await isRedLettering(manage.confirmationButton('Reset Template', 'Reset Template'))).toBe(true);
        await manage.confirmationButton('Reset Template', 'Cancel').click();
        await expect(resetConfirm).toBeHidden();
        await expect(manage.templateRow(win, 'Decline, edited')).toHaveCount(1);
        await manage.pastSideModalCloseWindow();
        await manage.rowButton(manage.templateRow(win, 'Decline, edited'), 'Reset').click();
        await manage.confirmationButton('Reset Template', 'Reset Template').click();
        await expect(resetConfirm).toBeHidden();
        await expect(manage.templateRow(win, installedName)).toHaveCount(1);
        expect(await manage.templateRowsRead(win)).toEqual([
            {name: installedName, badges: ['Default'], buttons: ['Edit']},
            {name: 'Short decline', badges: [], buttons: ['Edit', 'Remove']},
        ]);
        await manage.openTemplate(win, installedName);
        await expect(manage.subjectBox()).toHaveValue(installedSubject);
        await manage.closeWindow(manage.templateWindow());

        // "Remove" (Rule 17).
        const removeConfirm = manage.confirmation('Remove Template');
        await manage.rowButton(manage.templateRow(win, 'Short decline'), 'Remove').click();
        await expect(removeConfirm).toContainText('Are you sure you want to delete the template');
        expect(await isRedLettering(manage.confirmationButton('Remove Template', 'Remove Template'))).toBe(true);
        await expect(manage.confirmationButton('Remove Template', 'Cancel')).toBeVisible();
        await manage.confirmationButton('Remove Template', 'Remove Template').click();
        await expect(removeConfirm).toBeHidden();
        await expect(manage.templateRow(win, 'Short decline')).toHaveCount(0);
        await expect(manage.templateRow(win, installedName)).toHaveCount(1);

        // Control (Rules 10, 17).
        await manage.reload();
        const again = await manage.openEmail(EMAIL);
        await expect(manage.templateRows(again.window)).toHaveCount(1);
        expect(await manage.templateRowsRead(again.window)).toEqual([{name: installedName, badges: ['Default'], buttons: ['Edit']}]);
    });

    test('S4: the press\'s signature, a one-template email, and "Reset All"', async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag(4, testInfo);
        const author = person(tag, 'au', 'Ada', 'Author', ['author']);
        const manager = await seedScratchPress(ompApi, tag, {extraUsers: [author]});
        const drafts = [];
        for (const n of [1, 2]) {
            drafts.push(
                await ompApi.createSubmission({
                    tag: `${tag}d${n}`,
                    context: tag,
                    submitter: author.username,
                    title: `Draft ${n} ${tag}`,
                    submitted: false,
                    participants: [],
                })
            );
        }
        const mp = await signedIn(asUser, manager);
        const ap = await signedIn(asUser, author.username);
        const tab = new WorkflowEmailsSettingsPage(mp, tag);

        /** The Author submits a seeded draft through the wizard, uploading its manuscript on the first step. */
        async function submitDraft(draft, n) {
            await ap.goto(wizardUrl(tag, draft.submissionId));
            await expectWizardOpen(ap);
            await completeAndSubmitDraft(ap, `ms-${tag}d${n}.txt`);
        }

        // The signature as installed (Rule 2).
        await tab.goto();
        const installedSignature = await tab.signatureHtml();
        const link = installedSignature.match(/This is an automated message from <a href="([^"]+)">([^<]+)<\/a>\./);
        expect(link, 'the automated-message line with the press\'s name as a link').not.toBeNull();
        expect(link?.[1]).toMatch(new RegExp(`/index\\.php/${tag}$`));
        expect(link?.[2]).toBe(`Scratch context ${tag}`);
        expect(plain(installedSignature)).toBe(`— This is an automated message from Scratch context ${tag}.`);

        // The signature changed (Rule 1; Settings bullet 1).
        await tab.typeSignature('The Scratch Journal team');
        await tab.save();

        // The Author's first submission: the confirmation ends with the
        // signature (Rule 2).
        await submitDraft(drafts[0], 1);
        const first = await pkpMail.find({to: author.email, contains: 'The Scratch Journal team', timeoutMs: 30_000});
        const firstFull = await pkpMail.fullMessage(first.ID);
        expect(firstFull.Subject).toBe(`Thank you for your submission to Scratch context ${tag}`);
        expect((firstFull.Text || '').trim().endsWith('The Scratch Journal team'), 'the confirmation ends with the signature').toBe(true);

        // A one-template email (Rules 9, 11, 18).
        const manage = await tab.openManageEmails();
        const ack = await manage.openEmail(ACK_EMAIL);
        expect(ack.kind).toBe('one');
        await expect(manage.nameBox()).toHaveValue(ACK_EMAIL);
        expect(await manage.subjectBox().inputValue()).toBeTruthy();
        const installedBody = await manage.bodyHtml();
        expect(installedBody).toContain('{$contextSignature}');
        await expect(manage.templateSaveButton()).toBeVisible();
        await manage.typeBody('Thank you for your submission.');
        await manage.saveTemplate();

        // The Author's second submission: the edited text, no signature
        // (Rule 2; Side effects).
        await submitDraft(drafts[1], 2);
        await expect.poll(() => pkpMail.count({to: author.email}), {timeout: 30_000}).toBe(2);
        const second = (await pkpMail.inboxFor(author.email)).find((m) => m.ID !== first.ID);
        const secondFull = await pkpMail.fullMessage(second.ID);
        expect(secondFull.Text || '').toContain('Thank you for your submission.');
        expect(secondFull.Text || '').not.toContain('The Scratch Journal team');

        // The site's placeholders (Rules 14, 15).
        const reset = await manage.openEmail('Password Reset Confirm');
        expect(reset.kind).toBe('one');
        const resetBody = await manage.bodyHtml();
        const insert = await manage.openInsertContent();
        const values = (await manage.insertContentRows(insert)).map((r) => r.value);
        expect(values).toEqual(expect.arrayContaining(['{$siteTitle}', '{$siteSignature}', '{$siteContactName}', '{$siteContactEmail}']));
        expect(values.filter((v) => v.startsWith('{$context')), 'none of the press\'s own').toEqual([]);
        await manage.insertPlaceholder(insert, '{$siteTitle}');
        await expect(insert).toBeHidden();
        const asked = [];
        mp.on('dialog', async (d) => {
            asked.push(d.type());
            await d.accept();
        });
        await manage.closeWindow(manage.templateWindow());
        expect(asked, 'nothing asks on closing').toEqual([]);
        await manage.openEmail('Password Reset Confirm');
        expect(await manage.bodyHtml(), 'nothing stored').toBe(resetBody);
        await manage.closeWindow(manage.templateWindow());

        // An added template (Rule 12).
        const declined = await manage.openEmail('Submission Declined');
        await manage.openAddTemplate(declined.window);
        await manage.nameBox().fill('Short decline');
        await manage.subjectBox().fill('A short decline');
        await manage.typeBody('We cannot take it further.');
        await manage.saveTemplate();
        const addedRow = manage.templateRow(declined.window, 'Short decline');
        await expect(addedRow).toHaveCount(1);
        expect((await manage.templateRowsRead(declined.window))[1]).toEqual({name: 'Short decline', badges: [], buttons: ['Edit', 'Remove']});

        // "Reset All" cancelled (Rule 19).
        await manage.reload();
        await manage.resetAllButton().click();
        const resetAll = manage.confirmation('Reset All');
        await expect(resetAll).toContainText(RESET_ALL_SENTENCE);
        expect(await isRedLettering(manage.confirmationButton('Reset All', 'Reset All'))).toBe(true);
        await manage.confirmationButton('Reset All', 'Cancel').click();
        await expect(resetAll).toBeHidden();
        await manage.pastSideModalCloseWindow();
        const stillAdded = await manage.openEmail('Submission Declined');
        await expect(manage.templateRow(stillAdded.window, 'Short decline')).toHaveCount(1);

        // "Reset All" confirmed (Rule 19): the page reloads, the installed
        // text is back and the added template is gone.
        await manage.reload();
        await manage.resetAllButton().click();
        await manage.confirmResetAll();
        await manage.openEmail(ACK_EMAIL);
        expect(await manage.bodyHtml()).toBe(installedBody);
        await manage.closeWindow(manage.templateWindow());
        const afterReset = await manage.openEmail('Submission Declined');
        await expect(manage.templateRows(afterReset.window)).toHaveCount(1);
        await expect(manage.templateRow(afterReset.window, 'Short decline')).toHaveCount(0);

        // Control (Rule 19): the signature is untouched.
        await tab.goto();
        expect(plain(await tab.signatureHtml())).toBe('The Scratch Journal team');
    });

    test('S5: templates in two languages', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag(5, testInfo);
        const manager = await seedScratchPress(ompApi, tag, {
            context: {supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
        });
        const mp = await signedIn(asUser, manager);
        const tab = new WorkflowEmailsSettingsPage(mp, tag);
        const EMAIL = 'Review Request';

        // The language button (Rule 20).
        await tab.goto();
        const manage = await tab.openManageEmails();
        const opened = await manage.openEmail(EMAIL);
        const win = opened.window;
        const [defaultRow] = await manage.templateRowsRead(win);
        const form = await manage.openTemplate(win, defaultRow.name);
        await expect(manage.languageButton('French')).toBeVisible();
        await expect(form.getByText('English', {exact: true})).toBeVisible();
        for (const field of ['name', 'subject', 'body']) {
            await expect(manage.languageCount(field), `the count under "${field}"`).toHaveText('2/2 languages completed');
        }

        // The French twins (Rule 20).
        await expect(manage.nameBox('fr_CA')).toBeHidden();
        await manage.languageButton('French').click();
        await expect(manage.nameBox('fr_CA')).toBeVisible();
        await expect(manage.subjectBox('fr_CA')).toBeVisible();
        await expect(mp.locator(`#${manage.bodyId('fr_CA')}_ifr`)).toBeVisible();
        for (const field of ['name', 'subject', 'body']) {
            await expect(manage.templateField(field, 'fr_CA').locator('label, .pkpFormFieldLabel').first()).toContainText('French');
        }
        await manage.languageButton('French').click();
        await expect(manage.nameBox('fr_CA')).toBeHidden();
        await expect(manage.subjectBox('fr_CA')).toBeHidden();
        await expect(manage.nameBox('en')).toBeVisible();

        // The English subject emptied (Rules 13, 15, 20).
        await manage.subjectBox('en').fill('');
        const refused = await manage.pressTemplateSave();
        expect(refused.status).toBe(400);
        await expect(form).toBeVisible();
        await expect(manage.templateFieldError('subject', 'en')).toHaveText('You must complete this field in English.');
        await expect(manage.templateFooter()).toContainText('Please correct one error.');
        const asked = [];
        mp.on('dialog', async (d) => {
            asked.push(d.type());
            await d.accept();
        });
        await manage.closeWindow(form);
        expect(asked, 'nothing asks on closing').toEqual([]);

        // A template added in French only (Rules 13, 20).
        await manage.openAddTemplate(win);
        await manage.languageButton('French').click();
        await manage.nameBox('fr_CA').fill('Refus court');
        await manage.subjectBox('fr_CA').fill('Un refus court');
        await manage.typeBody('Nous ne pouvons pas poursuivre.', {locale: 'fr_CA'});
        const frenchOnly = await manage.pressTemplateSave();
        expect(frenchOnly.status).toBe(400);
        for (const field of ['name', 'subject', 'body']) {
            await expect(manage.templateFieldError(field, 'en'), `the message under the English "${field}"`).toHaveText(REQUIRED);
        }
        await expect(manage.templateFooter()).toContainText('Please correct 3 errors.');

        // English added, a French field emptied (Rule 20).
        await manage.nameBox('en').fill('Short decline');
        await manage.subjectBox('en').fill('A short decline');
        await manage.typeBody('We cannot take it further.');
        await manage.subjectBox('fr_CA').fill('');
        await manage.saveTemplate();
        expect(await manage.templateRowsRead(win)).toEqual([
            {name: defaultRow.name, badges: ['Default'], buttons: ['Edit']},
            {name: 'Short decline', badges: [], buttons: ['Edit', 'Remove']},
        ]);
        await manage.openTemplate(win, 'Short decline');
        await expect(manage.languageCount('subject')).toHaveText('1/2 languages completed');
        await expect(manage.languageCount('name')).toHaveText('2/2 languages completed');
        await manage.languageButton('French').click();
        await expect(manage.subjectBox('fr_CA')).toBeVisible();
        await expect(manage.subjectBox('fr_CA')).toHaveValue('');
        await expect(manage.nameBox('fr_CA')).toHaveValue('Refus court');

        // Control: the seeded press's window has no language button (Rule 20).
        const sp = await signedIn(asUser, 'manager.maya');
        const seeded = new ManageEmailsPage(sp, SEEDED);
        await seeded.goto();
        const seededOpened = await seeded.openEmail(EMAIL);
        await seeded.openTemplate(seededOpened.window, defaultRow.name);
        await expect(seeded.nameBox('en')).toBeVisible();
        await expect(seeded.templateSaveButton()).toBeVisible();
        await expect(seeded.languageButton('French')).toHaveCount(0);
        await expect(seeded.languageCount('subject')).toHaveCount(0);
    });
});
