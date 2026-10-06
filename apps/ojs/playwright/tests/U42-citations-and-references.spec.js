// @ts-check
/**
 * @file playwright/tests/U42-citations-and-references.spec.js
 *
 * Citations & references — OJS suite, one test per canonical scenario the
 * spec runs on OJS (S1–S8 common; S9 {OJS OMP}).
 * Spec: docs/specs/U42-citations-and-references.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A2 🐞, A17 ❓: no line typed into "Add" repeats one already listed, and
 *   no "Edit" saves another row's text.
 * - A3 🐞: every search word is one the matching row's own text carries.
 * - A6 ✅ (retired 2026-10-06 at the PR heads of pkp/pkp-lib#13308: the
 *   box counts the references a lookup was asked for): S5 reads
 *   "Processing references - 0/1" over its one reference.
 * - A7 ✅ (retired 2026-10-06 at the PR heads of pkp/pkp-lib#13308): no
 *   wizard reference carries a DOI; the kept DOI is a Planned item.
 * - A9 🐞: no scenario here sets data citations to "Require".
 * - A13 🐞: every author row added in "Edit citation" is filled and saved.
 * - A14 🐞, A19 🐞: the author boxes and the ordering arrows are reached
 *   by their `name` attribute and by position; nothing asserts their
 *   accessible names.
 * - A16 🐞: S5 presses a structured row's expander by its current name
 *   and only with the mouse; the zero-size ones are never touched.
 * - A18 ✅ (retired 2026-09-29: every step change saves): every References
 *   change is still carried by "Continue"; the step rail only goes back.
 * - A4, A10, A20 (press / preprint server), A8, A11, A12, A15: not on
 *   these scenarios' OJS paths.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only. S1–S3 run on publicknowledge on their own scratch
 * submissions (a unique tag, M5); S1's submitter and the mailbox control's
 * recipient are throwaway accounts made on a scratch journal of their own,
 * so the mailbox read is scoped to an address nobody else writes to (A8).
 * S4–S9 run on scratch journals with throwaway accounts, as footnote s
 * says: `metadata`, `citationsMetadataLookup` and `review` on the context,
 * `citationsRaw` and `dataCitations[]` on the submission, `files[]` for a
 * draft's main file. S4 and S5 change the References settings on the
 * Settings screen because that screen is what the scenarios test.
 *
 * Lookup on (S5): no job runner and no outbound connection, so a
 * reference's lookup never finishes and the References page refetches
 * every 7 s while the progress box shows; every read after that
 * is a web-first assertion (it rides out a refetch), and row menus are
 * retried once when a refetch detaches their items (CitationsPages).
 * Every absence is read settled and paired with a positive control taken
 * the same way (M4, M6). Waits are web-first or bounded by the screen's
 * own API answer. Everything runs in the parallel `ojs` project.
 */
const {test, expect} = require('../support/fixtures.js');
const {unordered} = require('../../../../shared/playwright/support/order.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {ActivityLogWindow} = require('../../../../shared/playwright/pages/ActivityLogPages.js');
const {
    CITATIONS_TEXT: TEXT,
    ReferencesPage,
    DataCitationsTable,
    WizardCitations,
    landingReferences,
    expectTopToBottom,
} = require('../../../../shared/playwright/pages/CitationsPages.js');
const {
    ReviewerAssignmentsPage,
    ReviewWizardPage,
} = require('../../../../shared/playwright/pages/ReviewerPages.js');
const {PublicationScreen} = require('../pages/PublicationMetadataPages.js');
const {PublishScreen} = require('../pages/PublishSchedulePages.js');
const {SubmissionWizardPage} = require('../pages/SubmissionWizardPage.js');

const JOURNAL = 'publicknowledge';
const MANAGER = 'manager.maya';
const AUTHOR = 'author.alex';
const NOTIFY_SUBJECT = 'Discussion (Submission)';
const VERSION_1 = 'Version of Record 1.0';
const VERSION_2 = 'Version of Record 1.1';

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u42${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: mailOf(username), roles};
}

/**
 * Seed a scratch journal with a throwaway manager and author (with
 * `spare`, a second author-role account the mailbox control is sent to;
 * with `reviewer`, an external reviewer) and any context keys.
 */
async function seedJournal(ojsApi, tag, {spare = false, reviewer = false, ...context} = {}) {
    const users = [
        user(`${tag}mg`, 'Mona', 'Manager', ['manager']),
        user(`${tag}au`, 'Ada', 'Author', ['author']),
    ];
    if (spare) users.push(user(`${tag}x`, 'Xena', 'Spare', ['author']));
    if (reviewer) users.push(user(`${tag}rv`, 'Rita', 'Reviewer', ['externalReviewer']));
    await ojsApi.createContext({tag, users, ...context});
    return {
        manager: `${tag}mg`,
        author: `${tag}au`,
        spare: spare ? `${tag}x` : null,
        reviewer: reviewer ? `${tag}rv` : null,
    };
}

/** A page as `username` with the workflow frame of `contextPath`. */
async function pageAs(asUser, username, contextPath) {
    const page = await (await asUser(username)).newPage();
    return {page, frame: new WorkflowPage(page, contextPath)};
}

/** Open a submission's workflow (editorial, or the Author's view) and its "References" page. */
async function openReferences({page, frame}, submissionId, {author = false} = {}) {
    if (author) {
        await frame.gotoAuthor(submissionId);
    } else {
        await frame.gotoEditorial(submissionId);
    }
    const refs = new ReferencesPage(page, frame);
    await refs.open();
    return refs;
}

/** Open a submission's workflow (editorial, or the Author's view) and its "Data" page. */
async function openData({page, frame}, submissionId, {author = false} = {}) {
    if (author) {
        await frame.gotoAuthor(submissionId);
    } else {
        await frame.gotoEditorial(submissionId);
    }
    const data = new DataCitationsTable(page, {frame});
    await data.open();
    await expect(data.table()).toBeVisible({timeout: 30_000});
    return data;
}

/** Settings › Workflow › Submission › "Metadata", loaded. */
async function openMetadataSettings(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/management/settings/workflow`);
    await page.locator('#metadata-button').click();
    await expect(page.getByRole('checkbox', {name: 'Enable references metadata', exact: true})).toBeVisible({
        timeout: 30_000,
    });
}

/** Save the Metadata form, bounded by the context API answering OK. */
async function saveMetadataSettings(page) {
    const form = page
        .locator('form')
        .filter({has: page.getByRole('checkbox', {name: 'Enable keyword metadata', exact: true})});
    const saved = page.waitForResponse(
        (r) => r.url().includes('/api/v1/contexts/') && r.request().method() === 'POST' && r.ok(),
        {timeout: 30_000}
    );
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    await saved;
}

/** The Metadata screen's References controls. */
function referencesSettings(page) {
    return {
        enable: page.getByRole('checkbox', {name: 'Enable references metadata', exact: true}),
        doNotRequest: page.getByRole('radio', {
            name: 'Do not request references from the author during submission.',
        }),
        ask: page.getByRole('radio', {name: 'Ask the author to provide references during submission.'}),
        require: page.getByRole('radio', {
            name: 'Require the author to provide references before accepting their submission.',
        }),
        lookup: page.getByRole('checkbox', {
            name: 'Enable references structuring and metadata lookup',
            exact: true,
        }),
    };
}

/**
 * Reload a draft in the wizard and stand on its Details step: a reloaded
 * draft resumes at its saved step, and a step not yet reached has no rail
 * button, so the walk goes on from Upload Files when Details is not
 * current.
 */
async function reopenAtDetails(wizard, submissionId) {
    await wizard.goto(submissionId);
    await expect(wizard.currentStepLabel()).toBeVisible({timeout: 30_000});
    if (!(await wizard.currentStepLabel().textContent())?.includes('Details')) {
        await wizard.expectStep('Upload Files');
        await wizard.continueTo('Details');
    }
    await wizard.expectStep('Details');
}

/** From Details, "Continue" on each step until "Review" (each press saves its step). */
async function continueToReview(wizard, submissionId) {
    await wizard.continueTo('Contributors');
    await wizard.continueTo('For the Editors');
    await wizard.continueToReview(submissionId);
}

/**
 * The History tab's line count of the "Activity Log & Notes" window, then
 * the window closed.
 */
async function activityLogCount(page, frame) {
    const log = new ActivityLogWindow(page, frame);
    await log.open();
    const count = await log.historyRows().count();
    await log.close();
    return count;
}

/**
 * The positive control of an unchanged Activity Log: a Title & Abstract
 * save on the same submission writes one line (U43's control).
 */
async function logOneMetadataChange(page, contextPath, tag) {
    const pub = new PublicationScreen(page, contextPath);
    await pub.openEntry('Title & Abstract');
    await pub.setRichText('titleAbstract-subtitle-control-en', `Control ${tag}`);
    await pub.save();
}

/**
 * The mailbox silence, bounded: the manager's "Notify" to the spare on the
 * spare's own control submission is the one mail the test sends the same
 * way; then the submitter's address must hold nothing.
 */
async function expectNoMailToSubmitter(page, pkpMail, contextPath, {tag, controlSubmissionId, author, spare}) {
    const control = new PublicationScreen(page, contextPath);
    await control.gotoWorkflow(controlSubmissionId);
    await control.openStage('Submission');
    await control.notifyParticipant('Xena Spare', `<p>Control ${tag}</p>`);
    await pkpMail.expectNone({
        to: mailOf(author),
        afterControl: {to: mailOf(spare), subject: NOTIFY_SUBJECT, contains: `Control ${tag}`},
    });
}

test.describe('citations and references', () => {
    test('S1: maintain the reference list', {tag: '@smoke'}, async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(360_000);
        const tag = makeTag('s1', testInfo);
        // The submitter and the mailbox control's recipient are throwaway
        // accounts from a scratch journal of their own; both submit to the
        // seeded journal (footnote s, scenario 1).
        const {author, spare} = await seedJournal(ojsApi, tag, {spare: true});
        const [{submissionId}, control] = await Promise.all([
            ojsApi.createSubmission({tag, context: JOURNAL, submitter: author, title: `Submission ${tag}`}),
            ojsApi.createSubmission({
                tag: `${tag}c`,
                context: JOURNAL,
                submitter: spare,
                title: `Submission ${tag}c`,
            }),
        ]);

        const manager = await pageAs(asUser, MANAGER, JOURNAL);
        const refs = await openReferences(manager, submissionId);

        // "References": the heading (open() waits on it), then top to
        // bottom the "Add" box, Add, "Delete all references", and the
        // "Structured References" table with its line and search box
        // above it (Rule 3).
        await expect(manager.frame.heading()).toHaveText('Publication: References');
        await expect(refs.addBox()).toBeVisible();
        await expectTopToBottom([
            refs.addBox(),
            refs.addButton(),
            refs.deleteAllButton(),
            refs.structuredHeadings().last(),
            refs.tableLine(),
            refs.table(),
        ]);
        // The search box sits in the table's header, beside its title.
        await expectTopToBottom([refs.deleteAllButton(), refs.searchBox(), refs.table()]);
        await expect(refs.structuredHeadings()).toHaveCount(1);

        // Control: before the first add the table reads the empty line
        // (Rule 3); and the Activity Log's line count, the baseline of
        // "Nothing else happens".
        await expect(refs.rowCells()).toHaveText([TEXT.emptyReferences]);
        const logBefore = await activityLogCount(manager.page, manager.frame);

        // An empty Add: refused in place, nothing added, Add grayed out
        // until something is typed (Fields & validation).
        await refs.addButton().click();
        await expect(refs.addError()).toHaveText(TEXT.required, {timeout: 30_000});
        await expect(refs.addButton()).toBeDisabled();
        await expect(refs.rowCells()).toHaveText([TEXT.emptyReferences]);
        await refs.addBox().fill('x');
        await expect(refs.addButton()).toBeEnabled({timeout: 30_000});

        // Several lines at once: a line of runs of spaces, a blank line,
        // one padded line and a plain one: the box empties, "Saved" shows,
        // three rows in order with single spaces (Rule 5).
        await refs.add(['Alpha  study  2020', '', '  Beta trial 2021  ', 'Gamma report 2022']);
        await expect(refs.savedStatus()).toBeVisible({timeout: 30_000});
        await expect(refs.rowCells()).toHaveText(['Alpha study 2020', 'Beta trial 2021', 'Gamma report 2022'], {
            timeout: 30_000,
        });

        // Edit: the menu offers "Edit" and "Delete"; the panel holds one box,
        // "Edit Raw Citation", with the text (Rules 4, 6).
        const items = await refs.openRowMenu('Alpha study 2020');
        await expect(items).toHaveText(['Edit', 'Delete']);
        await refs.closeRowMenu('Alpha study 2020');
        const panel = await refs.edit('Alpha study 2020');
        await expect(panel.textboxes()).toHaveCount(1);
        await expect(panel.rawBox()).toHaveValue('Alpha study 2020');

        // Emptied and saved: both messages under the box, the foot's line,
        // the panel open, the row unchanged (Fields & validation).
        await panel.rawBox().fill('');
        await panel.saveRefused(TEXT.required);
        await expect(panel.rawErrors().filter({hasText: TEXT.notValidString})).toHaveCount(1);
        await expect(panel.rawErrors().filter({hasText: TEXT.required})).toHaveCount(1);
        await expect(panel.errorSummary()).toBeVisible();
        await expect(refs.rowCells().first()).toHaveText('Alpha study 2020');

        // The new text saved: the panel closes and the row reads it (Rule 6).
        await panel.rawBox().fill('Alpha study 2020, revised');
        await panel.save();
        await expect(refs.rowCells()).toHaveText(
            ['Alpha study 2020, revised', 'Beta trial 2021', 'Gamma report 2022'],
            {timeout: 30_000}
        );

        // Search: typing alone changes nothing; Enter narrows to "Beta";
        // the box's "Clear search phrase" brings every row back (Rule 8).
        await refs.typeSearch('BETA');
        await expect(refs.searchBox()).toHaveValue('BETA');
        await expect(refs.rowCells()).toHaveCount(3);
        await refs.commitSearch();
        await expect(refs.rowCells()).toHaveText(['Beta trial 2021'], {timeout: 30_000});
        await refs.clearSearchButton().click();
        await expect(refs.rowCells()).toHaveText(
            ['Alpha study 2020, revised', 'Beta trial 2021', 'Gamma report 2022'],
            {timeout: 30_000}
        );

        // The Author's read-only page: the three rows, Add and "Delete all
        // references" grayed out, no row menu; the box takes typing but Add
        // stays grayed out; the search still works (Rule 9). The manager's
        // menus above are the positive control of "no menu".
        await expect(refs.menuButtons()).toHaveCount(3);
        const authorView = await pageAs(asUser, author, JOURNAL);
        const authorRefs = await openReferences(authorView, submissionId, {author: true});
        await expect(authorRefs.rowCells()).toHaveText(
            ['Alpha study 2020, revised', 'Beta trial 2021', 'Gamma report 2022'],
            {timeout: 30_000}
        );
        await expect(authorRefs.addButton()).toBeDisabled();
        await expect(authorRefs.deleteAllButton()).toBeDisabled();
        await expect(authorRefs.menuButtons()).toHaveCount(0);
        await authorRefs.addBox().fill('Delta paper 2023');
        await expect(authorRefs.addBox()).toHaveValue('Delta paper 2023');
        await expect(authorRefs.addButton()).toBeDisabled();
        await authorRefs.typeSearch('gamma');
        await authorRefs.commitSearch();
        await expect(authorRefs.rowCells()).toHaveText(['Gamma report 2022'], {timeout: 30_000});
        await authorView.page.close();

        // Delete: the confirmation "Delete" and its question; Cancel keeps
        // the row; OK removes it (Rule 7).
        await refs.rowAction('Gamma report 2022', 'Delete');
        const deleteDialog = refs.deleteDialog();
        await expect(deleteDialog).toBeVisible({timeout: 30_000});
        await expect(deleteDialog.getByRole('heading', {name: 'Delete', exact: true})).toBeVisible();
        await refs.confirmCancel(deleteDialog);
        await expect(refs.row('Gamma report 2022')).toHaveCount(1);
        await refs.deleteRow('Gamma report 2022');
        await expect(refs.rowCells()).toHaveText(['Alpha study 2020, revised', 'Beta trial 2021']);

        // Delete all references: its confirmation; OK empties the list
        // (Rules 3, 7).
        await refs.deleteAllButton().click();
        const deleteAll = refs.deleteAllDialog();
        await expect(deleteAll).toBeVisible({timeout: 30_000});
        await expect(deleteAll.getByRole('heading', {name: 'Delete all references', exact: true})).toBeVisible();
        await refs.confirmOk(deleteAll, /deleteCitationsByPublicationId$/);
        await expect(refs.rowCells()).toHaveText([TEXT.emptyReferences], {timeout: 30_000});

        // Nothing else happens: the Activity Log has no new line (Side
        // effects) …
        expect(await activityLogCount(manager.page, manager.frame)).toBe(logBefore);
        // … positive control: a Title & Abstract save writes one.
        await logOneMetadataChange(manager.page, JOURNAL, tag);
        expect(await activityLogCount(manager.page, manager.frame)).toBe(logBefore + 1);
        // … and no email reached the submitter, read after the control
        // mail the test sends the same way (A8).
        await expectNoMailToSubmitter(manager.page, pkpMail, JOURNAL, {
            tag,
            controlSubmissionId: control.submissionId,
            author,
            spare,
        });
    });

    test('S2: type references while submitting', {tag: '@smoke'}, async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const {submissionId} = await ojsApi.createSubmission({
            tag,
            context: JOURNAL,
            submitter: AUTHOR,
            title: `Submission ${tag}`,
            submitted: false,
            files: [{file: 'article.pdf'}],
        });

        const authorPage = await (await asUser(AUTHOR)).newPage();
        const wizard = new SubmissionWizardPage(authorPage, JOURNAL);
        const cit = new WizardCitations(authorPage);
        await reopenAtDetails(wizard, submissionId);

        // The "Details" step: after the title, keywords and abstract comes
        // the References box with its help text and no required mark
        // (Rule 16; Fields & validation).
        await expectTopToBottom([
            authorPage.locator('#titleAbstract-title-control-en_ifr'),
            wizard.keywordsInput('en'),
            authorPage.locator('#titleAbstract-abstract-control-en_ifr'),
            cit.referencesBox(),
        ]);
        await expect(cit.referencesHelp()).toBeVisible();
        await expect(cit.referencesRequiredMark()).toHaveCount(0);
        await expect(wizard.requiredMark('titleAbstract-title-control-en')).toHaveCount(1);
        await expect(cit.referencesBox()).toHaveValue('');

        // An empty box on "Review": "None provided" under "References".
        await continueToReview(wizard, submissionId);
        await expect(cit.reviewValue('References')).toHaveText(TEXT.noneProvided);

        // A repeated line: back to Details by the rail, three lines typed,
        // "Continue" saves the step at once (Rule 16).
        await wizard.gotoStep('Details');
        await cit.referencesBox().fill('Beta trial 2021\nAlpha study 2020\nBeta trial 2021');
        await continueToReview(wizard, submissionId);

        // On "Review": the three lines, the repeat kept; submit (Rule 16).
        await expect(cit.reviewEntries('References')).toHaveText([
            'Beta trial 2021',
            'Alpha study 2020',
            'Beta trial 2021',
        ]);
        await wizard.submitAndConfirm();

        // The Journal Manager's list: the same three rows in order, and no
        // other — the empty save on the way to the first "Review" added
        // nothing (Rules 1, 16; the control).
        const refs = await openReferences(await pageAs(asUser, MANAGER, JOURNAL), submissionId);
        await expect(refs.rowCells()).toHaveText(['Beta trial 2021', 'Alpha study 2020', 'Beta trial 2021'], {
            timeout: 30_000,
        });
    });

    test('S3: read a published item\'s references', async ({ojsApi, page}, testInfo) => {
        const tag = makeTag('s3', testInfo);
        const published = {decisions: ['skipExternalReview', 'sendToProduction'], published: true};
        const [withRefs, noRefs] = await Promise.all([
            ojsApi.createSubmission({
                tag,
                context: JOURNAL,
                submitter: AUTHOR,
                title: `Submission ${tag}`,
                citationsRaw: ['Zulu report 2019', 'Alpha study 2020 https://example.org/alpha'],
                ...published,
            }),
            ojsApi.createSubmission({
                tag: `${tag}c`,
                context: JOURNAL,
                submitter: AUTHOR,
                title: `Submission ${tag}c`,
                ...published,
            }),
        ]);

        // The "References" block: the two references, one paragraph each,
        // in list order (Rule 27).
        await page.goto(`/index.php/${JOURNAL}/article/view/${withRefs.submissionId}`);
        const landing = landingReferences(page);
        await expect(landing.heading).toBeVisible({timeout: 30_000});
        await expect(landing.paragraphs).toHaveText([
            'Zulu report 2019',
            'Alpha study 2020 https://example.org/alpha',
        ]);

        // The linked address opens in a new tab (Rule 27).
        const link = landing.paragraphs.nth(1).getByRole('link', {name: 'https://example.org/alpha'});
        await expect(link).toHaveAttribute('href', 'https://example.org/alpha');
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(landing.paragraphs.nth(0).getByRole('link')).toHaveCount(0);

        // Control: the item with no references has no "References" block,
        // read once its page has rendered its title (Rule 27).
        await page.goto(`/index.php/${JOURNAL}/article/view/${noRefs.submissionId}`);
        await expect(page.getByRole('heading', {name: `Submission ${tag}c`})).toBeVisible({timeout: 30_000});
        await expect(landingReferences(page).block).toHaveCount(0);
        await expect(page.getByText('Zulu report 2019')).toHaveCount(0);
    });

    test('S4: the journal\'s References setting', async ({asUser, ojsApi, page}, testInfo) => {
        test.slow();
        test.setTimeout(420_000);
        const tag = makeTag('s4', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag);
        const [pub, draft] = await Promise.all([
            ojsApi.createSubmission({
                tag: `${tag}p`,
                context: tag,
                submitter: author,
                title: `Submission ${tag}p`,
                citationsRaw: 'Alpha study 2020',
                decisions: ['skipExternalReview', 'sendToProduction'],
                published: true,
            }),
            ojsApi.createSubmission({
                tag: `${tag}d`,
                context: tag,
                submitter: author,
                title: `Submission ${tag}d`,
                submitted: false,
                files: [{file: 'article.pdf'}],
            }),
        ]);

        const mgr = await pageAs(asUser, manager, tag);
        const authorPage = await (await asUser(author)).newPage();
        const wizard = new SubmissionWizardPage(authorPage, tag);
        const cit = new WizardCitations(authorPage);
        const settings = referencesSettings(mgr.page);

        /** The published submission's Publication area, open, with its pages listed. */
        const openPublishedWorkflow = async () => {
            await mgr.frame.gotoEditorial(pub.submissionId);
            await mgr.frame.expandLatestVersionNode();
        };

        // Control: at the install defaults the Author's Details step shows
        // the References box with no required mark, and the published
        // submission's Publication area lists "References" (Rules 2, 16).
        await reopenAtDetails(wizard, draft.submissionId);
        await expect(cit.referencesBox()).toBeVisible();
        await expect(cit.referencesRequiredMark()).toHaveCount(0);
        await openPublishedWorkflow();
        await expect(mgr.frame.pageLink('References')).toBeVisible();

        // "Do not request…": the screen arrives ticked at "Ask…"; pick "Do
        // not request…" and save. The Author's Details step has no box;
        // the Publication area still lists "References" (Rule 2).
        await openMetadataSettings(mgr.page, tag);
        await expect(settings.enable).toBeChecked();
        await expect(settings.ask).toBeChecked();
        await settings.doNotRequest.check();
        await saveMetadataSettings(mgr.page);
        await reopenAtDetails(wizard, draft.submissionId);
        await expect(wizard.keywordsInput('en')).toBeVisible();
        await expect(cit.referencesBox()).toHaveCount(0);
        await openPublishedWorkflow();
        await expect(mgr.frame.pageLink('References')).toBeVisible();

        // Switched off: unticking removes the lookup box; saved, the
        // Publication area lists no "References" (bounded by its sibling
        // "Title & Abstract"), the Details step still has no box, and the
        // landing page still lists the reference (Rules 2, 27).
        await openMetadataSettings(mgr.page, tag);
        await expect(settings.lookup).toBeVisible();
        await settings.enable.uncheck();
        await expect(settings.lookup).toHaveCount(0);
        await saveMetadataSettings(mgr.page);
        await openPublishedWorkflow();
        await expect(mgr.frame.pageLink('Title & Abstract')).toBeVisible();
        await expect(mgr.frame.pageLink('References')).toHaveCount(0);
        await reopenAtDetails(wizard, draft.submissionId);
        await expect(wizard.keywordsInput('en')).toBeVisible();
        await expect(cit.referencesBox()).toHaveCount(0);
        await page.goto(`/index.php/${tag}/article/view/${pub.submissionId}`);
        await expect(landingReferences(page).paragraphs).toHaveText(['Alpha study 2020'], {timeout: 30_000});

        // "Require…": ticked again at "Require…" and saved. The box is
        // marked required; left empty, once "Checking your submission" has
        // gone, "Review" shows "None provided" under "References" and
        // "This field is required." above it (Rule 16, scenario 4).
        await openMetadataSettings(mgr.page, tag);
        await settings.enable.check();
        await settings.require.check();
        await saveMetadataSettings(mgr.page);
        await reopenAtDetails(wizard, draft.submissionId);
        await expect(cit.referencesRequiredMark()).toHaveCount(1, {timeout: 30_000});
        await expect(cit.referencesBox()).toHaveValue('');
        await continueToReview(wizard, draft.submissionId);
        await expect(cit.reviewValue('References')).toHaveText(TEXT.noneProvided);
        await expect(cit.reviewWarnings('References')).toHaveText([TEXT.required]);

        // The submission cannot be completed with the box empty: "Submit"
        // is grayed out (Rule 16, scenario 4).
        await expect(wizard.submitButton()).toBeDisabled();
        await expect(wizard.completeHeading()).toHaveCount(0);

        // The box filled: back to Details by the rail, "Gamma report 2022"
        // typed, "Continue" to "Review", submitted. The manager's
        // "References" page lists it (Rule 16).
        await wizard.gotoStep('Details');
        await cit.referencesBox().fill('Gamma report 2022');
        await continueToReview(wizard, draft.submissionId);
        await expect(cit.reviewEntries('References')).toHaveText(['Gamma report 2022']);
        await wizard.submitAndConfirm();
        const refs = await openReferences(mgr, draft.submissionId);
        await expect(refs.rowCells()).toHaveText(['Gamma report 2022'], {timeout: 30_000});
    });

    test('S5: metadata lookup switched on', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(360_000);
        const tag = makeTag('s5', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag, {citationsMetadataLookup: true});
        const {submissionId} = await ojsApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: author,
            title: `Submission ${tag}s`,
            citationsRaw: 'Alpha study 2020',
        });

        const mgr = await pageAs(asUser, manager, tag);
        let refs = await openReferences(mgr, submissionId);

        // The page with lookup on: the lookup heading and text above the
        // "Add" box, "Reprocess all references" beside "Delete all
        // references", "Expand All" heading the second column (Rule 10).
        await expect(refs.structuredHeadings()).toHaveCount(2);
        await expect(refs.lookupText()).toHaveText(TEXT.lookupText);
        await expectTopToBottom([refs.lookupHeading(), refs.lookupText(), refs.addBox()]);
        await expect(refs.reprocessAllButton()).toBeVisible();
        await expect(refs.deleteAllButton()).toBeVisible();
        await expect(refs.secondColumnHeader().getByRole('button', {name: 'Expand All', exact: true})).toBeVisible();
        // The progress box counts every reference, the plain one whose
        // lookup waits included (Rule 13).
        await expect(refs.progressTitle()).toHaveText('Processing references - 0/1', {timeout: 30_000});

        // "Expand All" with nothing structured toggles its label only
        // (Rule 10).
        await refs.expandAllButton().click();
        await expect(refs.expandAllButton()).toHaveText('Collapse All');
        await refs.expandAllButton().click();
        await expect(refs.expandAllButton()).toHaveText('Expand All');
        await expect(refs.rowCells()).toHaveText(['Alpha study 2020']);

        // A plain row: its text, and "Edit", "Delete", "Reprocess"
        // (Rules 4, 12, 15).
        let items = await refs.openRowMenu('Alpha study 2020');
        await expect(items).toHaveText(['Edit', 'Delete', 'Reprocess']);
        await refs.closeRowMenu('Alpha study 2020');

        // An empty "Edit Raw Citation": the structured form, the box
        // marked required; emptied, "Save" is refused in place; "Close"
        // leaves the row as it was (Fields & validation).
        let panel = await refs.edit('Alpha study 2020');
        await expect(panel.field('DOI')).toBeVisible();
        await expect(panel.rawRequiredMark()).toBeVisible();
        await panel.rawBox().fill('');
        await panel.saveRefused(TEXT.required);
        await panel.close();
        await expect(refs.rowCells()).toHaveText(['Alpha study 2020'], {timeout: 30_000});

        // Structured by hand: DOI, title, source, volume and one author
        // saved; the row shows the DOI link, then the title with an
        // expander; "Reprocess" is gone; the progress box reads 0/1
        // (Rules 11–15).
        panel = await refs.edit('Alpha study 2020');
        await panel.field('DOI').fill('10.1234/abcd');
        await panel.field('Title').fill('Alpha study');
        await panel.field('Source Name').fill('Journal of Tests');
        await panel.field('Volume').fill('12');
        await panel.addAuthor({givenName: 'Ada', familyName: 'Lovelace'});
        await panel.save();
        const row = refs.rows().first();
        const doiLink = row.getByRole('link', {name: '10.1234/abcd', exact: true});
        await expect(doiLink).toHaveAttribute('href', 'https://doi.org/10.1234/abcd', {timeout: 30_000});
        await expect(row.locator('td').first()).toContainText('Alpha study');
        await expect(row.getByRole('button', {name: 'Collapse'})).toBeVisible();
        await expectTopToBottom([doiLink, row.getByText('Alpha study', {exact: true})]);
        await expect(refs.progressTitle()).toHaveText('Processing references - 0/1', {timeout: 30_000});
        items = await refs.openRowMenu('Alpha study');
        await expect(items).toHaveText(['Edit', 'Delete']);
        await refs.closeRowMenu('Alpha study');

        // The details: the author, the source, "Volume: 12" and the raw
        // text in small print (Rule 12).
        await expect(row.getByText('Lovelace Ada')).toHaveCount(0);
        await row.getByRole('button', {name: 'Collapse'}).click();
        await expect(row.getByText('Lovelace Ada')).toBeVisible({timeout: 30_000});
        await expect(row).toContainText('Journal of Tests');
        await expect(row).toContainText(/Volume:\s*12/);
        await expect(refs.rowSmallPrint('Alpha study')).toHaveText('Alpha study 2020');

        // Only the text edited: the structured details stay; the small
        // print reads the new text (Rule 14).
        panel = await refs.edit('Alpha study');
        await expect(panel.field('DOI')).toHaveValue('10.1234/abcd');
        await panel.rawBox().fill('Alpha study 2020, revised');
        await panel.save();
        await expect(doiLink).toBeVisible({timeout: 30_000});
        await expect(row.getByText('Alpha study', {exact: true})).toBeVisible();
        // The list refetches after the save, and every 7 s while the edited
        // reference is looked up again (citationManagerStore), so one read
        // of the row's state can be stale: open it and read until the text
        // holds (.reports/flake-s26/fixC/diagnosis.md).
        await expect(async () => {
            if (!(await refs.rowSmallPrint('Alpha study').isVisible())) {
                await row.getByRole('button', {name: 'Collapse'}).click({timeout: 5_000});
            }
            await expect(refs.rowSmallPrint('Alpha study')).toHaveText('Alpha study 2020, revised', {timeout: 5_000});
        }).toPass({timeout: 30_000});

        // Control: lookup switched off: no lookup heading or text, no
        // "Reprocess all references", no "Expand All", no progress box;
        // the row shows its text alone; "Edit" offers the text box alone
        // (Settings bullet 2; Rules 3, 6).
        const settings = referencesSettings(mgr.page);
        await openMetadataSettings(mgr.page, tag);
        await expect(settings.lookup).toBeChecked();
        await settings.lookup.uncheck();
        await saveMetadataSettings(mgr.page);
        refs = await openReferences(mgr, submissionId);
        await expect(refs.rowCells()).toHaveText(['Alpha study 2020, revised'], {timeout: 30_000});
        await expect(refs.structuredHeadings()).toHaveCount(1);
        await expect(refs.lookupText()).toHaveCount(0);
        await expect(refs.reprocessAllButton()).toHaveCount(0);
        await expect(refs.deleteAllButton()).toBeVisible();
        await expect(refs.expandAllButton()).toHaveCount(0);
        await expect(refs.progressTitle()).toHaveCount(0);
        await expect(refs.rows().first().getByRole('link')).toHaveCount(0);
        panel = await refs.edit('Alpha study 2020, revised');
        await expect(panel.textboxes()).toHaveCount(1);
        await expect(panel.rawBox()).toHaveValue('Alpha study 2020, revised');
        await panel.close();

        // Ticked again: the DOI link and the title are back.
        await openMetadataSettings(mgr.page, tag);
        await settings.lookup.check();
        await saveMetadataSettings(mgr.page);
        refs = await openReferences(mgr, submissionId);
        const back = refs.rows().first();
        await expect(back.getByRole('link', {name: '10.1234/abcd', exact: true})).toBeVisible({timeout: 30_000});
        await expect(back.getByText('Alpha study', {exact: true})).toBeVisible();
    });

    test('S6: maintain data citations', async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(420_000);
        const tag = makeTag('s6', testInfo);
        const {manager, author, spare} = await seedJournal(ojsApi, tag, {
            spare: true,
            metadata: {dataCitations: 'request'},
        });
        const [{submissionId}, control] = await Promise.all([
            ojsApi.createSubmission({tag: `${tag}s`, context: tag, submitter: author, title: `Submission ${tag}s`}),
            ojsApi.createSubmission({tag: `${tag}c`, context: tag, submitter: spare, title: `Submission ${tag}c`}),
        ]);

        const mgr = await pageAs(asUser, manager, tag);
        let data = await openData(mgr, submissionId);

        // "Data": the heading, the table "Data Citations" with its line and
        // "Order" and "Add Data Citation" above it (Rules 18, 19).
        await expect(mgr.frame.heading()).toHaveText('Publication: Data');
        await expect(data.block().getByRole('heading', {name: 'Data Citations', exact: true})).toBeVisible();
        await expect(data.line()).toBeVisible();
        await expect(data.orderButton()).toBeVisible();
        await expect(data.addButton()).toBeVisible();
        await expectTopToBottom([data.orderButton(), data.table()]);

        // Control: the empty table, and the Activity Log baseline (Rule 19).
        await expect(data.rowCells()).toHaveText([TEXT.emptyData]);
        const logBefore = await activityLogCount(mgr.page, mgr.frame);

        // An empty save: refused, with messages under "Title" and
        // "Relationship type" (Fields & validation).
        const add = await data.openAdd();
        await add.saveRefused(TEXT.required);
        await expect(add.titleErrors()).toHaveText([TEXT.required]);
        await expect(add.relationshipErrors()).not.toHaveCount(0);

        // Refused values: an invalid DOI, a three-digit year, a bare ORCID
        // iD, each refused with its message (Fields & validation).
        await add.fill({
            title: 'Ocean temperature records',
            relationshipType: 'generated',
            identifierType: 'DOI',
            identifier: 'not-a-doi',
        });
        await add.saveRefused('"not-a-doi" is not a valid DOI identifier.');
        await add.fill({identifier: 'https://doi.org/10.1234/abcd', year: '202'});
        await add.saveRefused(TEXT.fourDigits);
        await add.fill({year: '2024'});
        await add.addCreator({givenName: 'Ada', familyName: 'Lovelace', orcid: '0000-0002-1825-0097'});
        await add.saveRefused(TEXT.orcidInvalid);

        // The saved data citation: the row shows the bare DOI above the
        // title (Rules 19, 21).
        await add.creatorRows().first().locator('input[name="orcid"]').fill('https://orcid.org/0000-0002-1825-0097');
        await add.save();
        const ocean = data.row('Ocean temperature records');
        await expect(ocean).toBeVisible({timeout: 30_000});
        await expectTopToBottom([ocean.getByText('10.1234/abcd', {exact: true}), ocean.getByText('Ocean temperature records', {exact: true})]);

        // View and Edit: "View", "Edit", "Delete"; "View" shows the fields
        // as text with "Close" its only button; "Edit" is prefilled with the
        // bare identifier; a new title saved (Rules 20, 21).
        let items = await data.openRowMenu('Ocean temperature records');
        await expect(items).toHaveText(['View', 'Edit', 'Delete']);
        await data.closeRowMenu('Ocean temperature records');
        const view = await data.view('Ocean temperature records');
        await expect(view.dialog()).toContainText('Ocean temperature records');
        await expect(view.dialog()).toContainText('10.1234/abcd');
        await expect(view.dialog().getByRole('textbox')).toHaveCount(0);
        await expect(view.closeButton()).toBeVisible();
        await expect(view.headerActions()).toHaveCount(0);
        await expect(view.bodyButtons()).toHaveCount(0);
        await view.close();
        const edit = await data.edit('Ocean temperature records');
        await expect(edit.identifierBox()).toHaveValue('10.1234/abcd');
        // (The positive control of "no other button": the same read finds
        // "Save" in the editing panel.)
        await expect(edit.bodyButtons().filter({hasText: 'Save'})).toHaveCount(1);
        await edit.fill({title: 'Ocean temperature records, revised'});
        await edit.save();
        await expect(data.row('Ocean temperature records, revised')).toBeVisible({timeout: 30_000});

        // Ordering: two more; the table lists the three in no fixed order
        // until an order is saved (A8); "Order" swaps the menus for arrows
        // and reads "Save Order"; the up arrow on C until it is first (none
        // when it already is), each press moving it one place; saved: the
        // menus are back, C first and the other two as they stood; a reload
        // keeps that order (Rule 23).
        await data.add({title: 'Dataset B', relationshipType: 'supporting'});
        await data.add({title: 'Dataset C', relationshipType: 'supporting'});
        const titles = ['Ocean temperature records, revised', 'Dataset B', 'Dataset C'];
        const shownTitles = async () =>
            (await data.rowCells().allTextContents()).map((text) => titles.find((title) => text.trim().endsWith(title)) || text.trim());
        const endsWith = (list) => list.map((title) => new RegExp(`${title}$`));
        await expect(data.rowCells()).toHaveCount(3, {timeout: 30_000});
        await expect.poll(async () => unordered(await shownTitles()), {timeout: 30_000}).toEqual(unordered(titles));
        await expect(data.menuButtons()).toHaveCount(3);
        await data.orderButton().click();
        await expect(data.saveOrderButton()).toBeVisible({timeout: 30_000});
        await expect(data.menuButtons()).toHaveCount(0);
        await expect(data.rowArrows('Dataset C')).toHaveCount(2);
        const before = await shownTitles();
        let order = [...before];
        while (order[0] !== 'Dataset C') {
            const at = order.indexOf('Dataset C');
            order = [...order.slice(0, at - 1), 'Dataset C', order[at - 1], ...order.slice(at + 1)];
            await data.moveUp('Dataset C');
            await expect(data.rowCells()).toHaveText(endsWith(order));
        }
        const saved = ['Dataset C', ...before.filter((title) => title !== 'Dataset C')];
        await data.saveOrder();
        await expect(data.menuButtons()).toHaveCount(3, {timeout: 30_000});
        await expect(data.rowCells()).toHaveText(endsWith(saved));
        data = await openData(mgr, submissionId);
        await expect(data.rowCells()).toHaveText(endsWith(saved), {
            timeout: 30_000,
        });

        // Delete: the confirmation; Cancel keeps the row; OK removes it
        // (Rule 22).
        await data.rowAction('Dataset B', 'Delete');
        const deleteDialog = data.deleteDialog();
        await expect(deleteDialog).toBeVisible({timeout: 30_000});
        await expect(deleteDialog.getByRole('heading', {name: 'Delete', exact: true})).toBeVisible();
        await deleteDialog.getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(deleteDialog).toHaveCount(0, {timeout: 30_000});
        await expect(data.row('Dataset B')).toHaveCount(1);
        await data.deleteRow('Dataset B');
        await expect(data.rowCells()).toHaveText([/Dataset C$/, /Ocean temperature records, revised$/]);

        // The Author's view: the two rows; no line, no "Order", no "Add
        // Data Citation"; "View" alone in the menu (Rule 20). The manager's
        // controls above are the positive control, read the same way.
        const authorView = await pageAs(asUser, author, tag);
        const authorData = await openData(authorView, submissionId, {author: true});
        await expect(authorData.rowCells()).toHaveText([/Dataset C$/, /Ocean temperature records, revised$/], {
            timeout: 30_000,
        });
        await expect(authorData.line()).toHaveCount(0);
        await expect(authorData.orderButton()).toHaveCount(0);
        await expect(authorData.addButton()).toHaveCount(0);
        items = await authorData.openRowMenu('Dataset C');
        await expect(items).toHaveText(['View']);
        await authorData.closeRowMenu('Dataset C');
        await authorView.page.close();

        // Nothing else happens: no new Activity Log line, then the positive
        // control's one; no email to the submitter after the control mail
        // (Side effects; A8).
        expect(await activityLogCount(mgr.page, mgr.frame)).toBe(logBefore);
        await logOneMetadataChange(mgr.page, tag, tag);
        expect(await activityLogCount(mgr.page, mgr.frame)).toBe(logBefore + 1);
        await expectNoMailToSubmitter(mgr.page, pkpMail, tag, {
            tag,
            controlSubmissionId: control.submissionId,
            author,
            spare,
        });
    });

    test('S7: declare data citations while submitting', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s7', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag, {metadata: {dataCitations: 'request'}});
        const {submissionId} = await ojsApi.createSubmission({
            tag: `${tag}d`,
            context: tag,
            submitter: author,
            title: `Submission ${tag}d`,
            submitted: false,
            files: [{file: 'article.pdf'}],
        });

        const authorPage = await (await asUser(author)).newPage();
        const wizard = new SubmissionWizardPage(authorPage, tag);
        const cit = new WizardCitations(authorPage);
        await reopenAtDetails(wizard, submissionId);

        // The "Data" section: its heading and line, the table with "Order"
        // and "Add Data Citation"; the control: the empty table (Rules 19,
        // 24).
        const section = cit.dataSection();
        await expect(section).toHaveCount(1, {timeout: 30_000});
        await expect(section.getByRole('heading', {name: 'Data', exact: true})).toBeVisible();
        await expect(section.getByText(TEXT.wizardDataLine)).toBeVisible();
        const data = cit.dataTable();
        await expect(data.orderButton()).toBeVisible();
        await expect(data.addButton()).toBeVisible();
        await expect(data.rowCells()).toHaveText([TEXT.emptyData]);

        // An added data citation: on a journal the row shows at once
        // (Rule 24).
        await data.add({title: 'Ocean temperature records', relationshipType: 'supporting'});
        await expect(data.rowCells()).toHaveText([/Ocean temperature records$/]);

        // On "Review": the title under "Data Citations"; submitted (Rule 24).
        await continueToReview(wizard, submissionId);
        await expect(cit.reviewEntries('Data Citations')).toHaveText(['Ocean temperature records']);
        await wizard.submitAndConfirm();

        // The Journal Manager's list (Rules 18, 19).
        const mgrData = await openData(await pageAs(asUser, manager, tag), submissionId);
        await expect(mgrData.rowCells()).toHaveText([/Ocean temperature records$/], {timeout: 30_000});
    });

    test('S8: a new version copies both lists', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s8', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag, {metadata: {dataCitations: 'request'}});
        const {submissionId} = await ojsApi.createSubmission({
            tag: `${tag}p`,
            context: tag,
            submitter: author,
            title: `Submission ${tag}p`,
            citationsRaw: ['Alpha study 2020', 'Beta trial 2021'],
            dataCitations: [{title: 'Ocean temperature records', relationshipType: 'generated'}],
            decisions: ['skipExternalReview', 'sendToProduction'],
            published: true,
        });

        const mgr = await pageAs(asUser, manager, tag);
        const publish = new PublishScreen(mgr.page, tag);
        await mgr.frame.gotoEditorial(submissionId);
        await publish.confirmVersionDialog(await publish.openCreateVersionDialog());
        await expect(mgr.frame.menu().getByRole('treeitem', {name: VERSION_2, exact: true})).toBeVisible({
            timeout: 30_000,
        });

        // The new version: both references and the data citation copied
        // (Rule 26).
        const refs = new ReferencesPage(mgr.page, mgr.frame);
        const data = new DataCitationsTable(mgr.page, {frame: mgr.frame});
        await refs.openInVersion(VERSION_2);
        await expect(refs.rowCells()).toHaveText(['Alpha study 2020', 'Beta trial 2021'], {timeout: 30_000});
        await data.openInVersion(VERSION_2);
        await expect(data.rowCells()).toHaveText([/Ocean temperature records$/], {timeout: 30_000});

        // Changes on the new version: "Beta" deleted, "Gamma" added, the
        // data citation deleted (Rules 5, 7, 22, 26).
        await refs.openInVersion(VERSION_2);
        await refs.deleteRow('Beta trial 2021');
        await refs.add('Gamma report 2022');
        await expect(refs.rowCells()).toHaveText(['Alpha study 2020', 'Gamma report 2022'], {timeout: 30_000});
        await data.openInVersion(VERSION_2);
        await data.deleteRow('Ocean temperature records');
        await expect(data.rowCells()).toHaveText([TEXT.emptyData], {timeout: 30_000});

        // Control: the published version keeps both lists (Rules 1, 26).
        await refs.openInVersion(VERSION_1);
        await expect(refs.rowCells()).toHaveText(['Alpha study 2020', 'Beta trial 2021'], {timeout: 30_000});
        await data.openInVersion(VERSION_1);
        await expect(data.rowCells()).toHaveText([/Ocean temperature records$/], {timeout: 30_000});
    });

    test('S9: what a Reviewer sees', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s9', testInfo);
        const seedInReview = async (path, defaultReviewMode) => {
            const {manager, reviewer, author} = await seedJournal(ojsApi, path, {
                reviewer: true,
                metadata: {dataCitations: 'request'},
                review: {defaultReviewMode},
            });
            const {submissionId} = await ojsApi.createSubmission({
                tag: `${path}s`,
                context: path,
                submitter: author,
                title: `Submission ${path}s`,
                decisions: ['sendExternalReview'],
                reviewRounds: [{reviewers: [{username: reviewer, status: 'accepted'}]}],
                citationsRaw: 'Alpha study 2020',
                dataCitations: [{title: 'Ocean temperature records', relationshipType: 'generated'}],
            });
            return {path, manager, reviewer, submissionId};
        };
        const [disclosed, anonymous] = await Promise.all([
            seedInReview(`${tag}a`, 'anonymous'),
            seedInReview(`${tag}b`, 'doubleAnonymous'),
        ]);

        /** As the Reviewer, open the review from the dashboard and its "View All Submission Details". */
        const openDetails = async ({path, reviewer}) => {
            const page = await (await asUser(reviewer)).newPage();
            const list = new ReviewerAssignmentsPage(page, path);
            await list.goto('actionRequired');
            const row = list.row(`Submission ${path}s`);
            await expect(row).toBeVisible({timeout: 30_000});
            await list.openWizard(row, 'Finish review');
            const wizard = new ReviewWizardPage(page, path);
            await wizard.expectOpen();
            const details = await wizard.openSubmissionDetails();
            await expect(details).toContainText(`Submission ${path}s`, {timeout: 30_000});
            return {page, details};
        };

        // The disclosed-author review: the table with the data citation,
        // no line, no "Order", no "Add Data Citation"; "View" alone, which
        // opens "View Data Citation"; the reference appears nowhere
        // (Rule 25; Actors row 7).
        const open = await openDetails(disclosed);
        const table = new DataCitationsTable(open.page, {scope: open.details});
        await expect(table.rowCells()).toHaveText([/Ocean temperature records$/], {timeout: 30_000});
        await expect(table.line()).toHaveCount(0);
        await expect(table.orderButton()).toHaveCount(0);
        await expect(table.addButton()).toHaveCount(0);
        const items = await table.openRowMenu('Ocean temperature records');
        await expect(items).toHaveText(['View']);
        await items.first().click();
        const view = table.panel('View Data Citation');
        await expect(view.dialog()).toContainText('Ocean temperature records', {timeout: 30_000});
        await view.close();
        await expect(open.details).not.toContainText('Alpha study 2020');

        // The anonymous review: the window, loaded (its title), shows no
        // Data Citations table (Rule 25).
        const closed = await openDetails(anonymous);
        await expect(new DataCitationsTable(closed.page, {scope: closed.details}).table()).toHaveCount(0);
        await expect(closed.details).not.toContainText('Ocean temperature records');

        // Control: the second journal's manager sees the data citation on
        // the "Data" page (Rule 19).
        const mgrData = await openData(await pageAs(asUser, anonymous.manager, anonymous.path), anonymous.submissionId);
        await expect(mgrData.rowCells()).toHaveText([/Ocean temperature records$/], {timeout: 30_000});
    });
});
