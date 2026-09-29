// @ts-check
/**
 * @file playwright/tests/U43-funding.spec.js
 *
 * Funding — OJS suite, one test per canonical scenario the spec runs on
 * OJS (S1–S5 common; S6 {OJS OMP}).
 * Spec: docs/specs/U43-funding.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A1 ❓
 * (S4 asserts the Review step's "Funders are required." warning only,
 * never whether the submit is enabled), A2 ❓, A3 🐞 (every funder takes
 * the typed-name path; the browser-side registry query is stubbed to an
 * empty result set, and the registry funder of S1 and S3 is stood in for
 * by a second typed-name funder), A4 🐞, A5 🐞 (the ordering arrows are
 * reached positionally; nothing asserts their accessibility), A6 ❓, A7 ❓
 * (S1 and S3 add every funder before ordering), A8 ❓ (S4 picks the "Do
 * not request…" level itself on the re-tick, asserting nothing about what
 * arrived preselected), A9 ❓, A10 ❓, A11 ❓, A12 ❓ (every name box is
 * left as it arrives or filled), OPS1 (preprint-only,
 * in that tree). The spec's Coverage section records everything else
 * left out.
 *
 * Hermeticity: the Funder field queries the public ROR registry from the
 * BROWSER; the suite stubs that query to an empty result set
 * (FundingPages.stubRegistrySearch) so no test depends on api.ror.org —
 * the typed-name path under test renders its typed-text option
 * independently of the suggestions payload.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only for settings (S4 and S6 run on scratch journals with
 * throwaway users). There is no funder seeding key — the add/edit panel IS
 * the surface under test, so funders are always recorded through it. The
 * mailbox silence (S1) is read in the shared Mailpit scoped to a throwaway
 * submitter's address the test created on a scratch journal (users are
 * created there and nowhere else) and bounded by a mail the test itself
 * sends the same way, the manager's "Notify" on a spare account's own
 * submission (A8, M4); the Activity Log silence is a row count before
 * and after, bounded by the test's own Title & Abstract save (the one
 * write that logs). Every absence is read with a settled locator and
 * paired with a positive control taken the same way (M6). Waits are
 * event-based (funders API responses, form-save responses, web-first
 * assertions) — no hard-coded sleeps. Everything runs in the parallel
 * `ojs` project.
 */
const fs = require('fs');
const {test, expect} = require('../support/fixtures.js');
const {FundingScreen, stubRegistrySearch, landingFunders} = require('../pages/FundingPages.js');
const {PublicationScreen} = require('../pages/PublicationMetadataPages.js');
const {SubmissionWizardPage} = require('../pages/SubmissionWizardPage.js');
const {
    ReviewerAssignmentsPage,
    ReviewWizardPage,
} = require('../../../../shared/playwright/pages/ReviewerPages.js');

const JOURNAL = 'publicknowledge';
const NOTIFY_SUBJECT = 'Discussion (Submission)';
const EMPTY_LIST = 'No funders have been added.';
const FUNDER_REQUIRED = 'Search and select a Funder or enter a Funder name';
const DOI_FORMAT = 'This is not formatted correctly.';
const FUNDERS_REQUIRED = 'Funders are required.';

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u43${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/**
 * Seed a scratch journal with one throwaway manager and one throwaway
 * author (plus, with `spare`, a third author-role account the mailbox
 * control is addressed to, and with `reviewer`, an external reviewer);
 * returns their usernames.
 *
 * @param {{spare?: boolean, reviewer?: boolean, review?: object}} options
 */
async function seedJournal(ojsApi, tag, {spare = false, reviewer = false, review} = {}) {
    const users = [
        {
            username: `${tag}mg`,
            givenName: 'Mona',
            familyName: 'Manager',
            email: mailOf(`${tag}mg`),
            roles: ['manager'],
        },
        {
            username: `${tag}au`,
            givenName: 'Ada',
            familyName: 'Author',
            email: mailOf(`${tag}au`),
            roles: ['author'],
        },
    ];
    if (spare) {
        users.push({
            username: `${tag}x`,
            givenName: 'Xena',
            familyName: 'Spare',
            email: mailOf(`${tag}x`),
            roles: ['author'],
        });
    }
    if (reviewer) {
        users.push({
            username: `${tag}rv`,
            givenName: 'Rita',
            familyName: 'Reviewer',
            email: mailOf(`${tag}rv`),
            roles: ['externalReviewer'],
        });
    }
    await ojsApi.createContext({
        tag,
        ...(review ? {review} : {}),
        users,
    });
    return {
        manager: `${tag}mg`,
        author: `${tag}au`,
        spare: spare ? `${tag}x` : null,
        reviewer: reviewer ? `${tag}rv` : null,
    };
}

/**
 * Open a page's workflow view and its Funding screen (the Publication group
 * is expanded by default; FundingScreen handles a collapsed one).
 */
async function openFunding(page, contextPath, submissionId, {author = false} = {}) {
    // Straight to the workflow dialog. Not via WorkflowPage.expectOpen: a
    // published submission's workflow opens on a "Publication: …" screen
    // with no "Workflow:" heading; FundingScreen waits on the Publication
    // menu instead.
    const dashboard = author ? 'mySubmissions' : 'editorial';
    await page.goto(
        `/index.php/${contextPath}/dashboard/${dashboard}?workflowSubmissionId=${submissionId}`
    );
    const funding = new FundingScreen(page);
    await funding.openFromWorkflow();
    return funding;
}

/**
 * Save the workflow settings' Metadata form (the one carrying the funders
 * setting), bounded by the context API answering OK.
 */
async function saveMetadataSettings(page) {
    const form = page
        .locator('form')
        .filter({has: page.getByRole('checkbox', {name: 'Enable funder metadata'})});
    const saved = page.waitForResponse(
        (r) =>
            r.url().includes('/api/v1/contexts/') &&
            r.request().method() === 'POST' &&
            r.ok(),
        {timeout: 30_000}
    );
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    await saved;
}

/** Open the Metadata settings screen (Settings › Workflow › Metadata). */
async function openMetadataSettings(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/management/settings/workflow`);
    await page.locator('#metadata-button').click();
    await expect(page.getByRole('checkbox', {name: 'Enable funder metadata'})).toBeVisible({
        timeout: 30_000,
    });
}

/**
 * Reload a draft in the wizard and stand on its Details step: a reloaded
 * draft resumes at its saved step, and a not-yet-started step has no rail
 * button to jump to, so the walk goes forward from Upload Files when
 * Details is not already current.
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

/**
 * The Activity Log's row count (the "Activity Log & Notes" window's grid,
 * `tr.gridRow`), read once the grid holds a row (a seeded submission
 * always carries its own lines), then the window closed.
 */
async function activityLogRowCount(pub) {
    const log = await pub.openActivityLog();
    const rows = log.locator('tr.gridRow');
    await expect(rows.first()).toBeVisible({timeout: 30_000});
    const count = await rows.count();
    await log.getByRole('button', {name: 'Close', exact: true}).first().click();
    await expect(log).toBeHidden({timeout: 30_000});
    return count;
}

/**
 * The mailbox silence, bounded: the manager's "Notify" on the spare's own
 * control submission is the one mail the test sends the same way, then
 * the throwaway submitter's address must hold nothing.
 */
async function expectNoMailToSubmitter(page, pkpMail, {tag, controlSubmissionId, author, spare}) {
    const controlPub = new PublicationScreen(page, JOURNAL);
    await controlPub.gotoWorkflow(controlSubmissionId);
    await controlPub.openStage('Submission');
    await controlPub.notifyParticipant('Xena Spare', `<p>Control ${tag}</p>`);
    await pkpMail.expectNone({
        to: mailOf(author),
        afterControl: {to: mailOf(spare), subject: NOTIFY_SUBJECT, contains: `Control ${tag}`},
    });
}

/** Move a row to the top with "Order" / its up arrow / "Save Order" (Rule 7). */
async function orderFirst(page, funding, name) {
    await funding.orderButton().click();
    // The row's up/down buttons carry no accessible name (A5 🐞), so they
    // are reached positionally — first button in the row is "up".
    await funding.row(name).locator('button').first().click();
    const orderSaved = page.waitForResponse(
        (r) =>
            r.url().includes('/funders/order') &&
            r.request().method() === 'POST' &&
            r.ok(),
        {timeout: 30_000}
    );
    await funding.saveOrderButton().click();
    await orderSaved;
}

test.describe('funding', () => {
    test('S1: record and revise funding in the workflow', {tag: '@smoke'}, async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(360_000);
        const tag = makeTag('s1', testInfo);
        const controlTag = makeTag('s1c', testInfo);
        // The throwaway submitter (the mailbox the silence is read in) and
        // the spare (the control mail's recipient) live on a scratch
        // journal and each submit to the seeded journal (footnote s1).
        const {author, spare} = await seedJournal(ojsApi, tag, {spare: true});
        const [{submissionId}, control] = await Promise.all([
            ojsApi.createSubmission({
                tag,
                context: JOURNAL,
                submitter: author,
                title: `Submission ${tag}`,
            }),
            ojsApi.createSubmission({
                tag: controlTag,
                context: JOURNAL,
                submitter: spare,
                title: `Submission ${controlTag}`,
            }),
        ]);
        const nameA = `Test Foundation ${tag}`;
        const nameB = `Beta Foundation ${tag}`;

        const page = await (await asUser('manager.maya')).newPage();
        await stubRegistrySearch(page);
        const pub = new PublicationScreen(page, JOURNAL);
        let funding = await openFunding(page, JOURNAL, submissionId);

        // "Funding": the screen is headed "Publication: Funding"
        // (openFromWorkflow waits on it) with the heading "Funders", its
        // explanation, a table whose column is "Funder Name" and "Order"
        // and "Add Funder" above it (Rule 3).
        await expect(page.getByRole('heading', {name: 'Funders', exact: true})).toBeVisible();
        await expect(
            page.getByText(
                'Add formal funding information, ensuring funders are properly credited and appear in the publication metadata.'
            )
        ).toBeVisible();
        await expect(funding.table().getByRole('columnheader', {name: 'Funder Name'})).toBeVisible();
        await expect(funding.orderButton()).toBeVisible();
        await expect(funding.addFunderButton()).toBeVisible();

        // Control: before the first add the list reads "No funders have
        // been added." (Rule 3) — and the Activity Log's row count, the
        // baseline of "no new entry" below.
        await expect(funding.table()).toContainText(EMPTY_LIST);
        const logBefore = await activityLogRowCount(pub);

        // An empty save: refused in place — the field's message, "Please
        // correct one error." and Save disabled (Fields).
        await funding.addFunderButton().click();
        const addPanel = funding.dialog('Add Funder');
        await expect(addPanel).toBeVisible({timeout: 30_000});
        await funding.saveRefused(addPanel, addPanel.getByText(FUNDER_REQUIRED));
        await expect(funding.funderFieldError(addPanel)).toContainText(FUNDER_REQUIRED);

        // The typed-name funder: pick the typed text itself; the required
        // name box arrives pre-filled; "Delete" under it clears the field
        // back to the search box; search and pick again (Fields; Rule 5).
        await funding.pickTypedFunder(addPanel, nameA);
        await expect(funding.funderNameBoxes(addPanel).first()).toHaveValue(nameA);
        await expect(funding.funderField(addPanel).getByText('Required')).toBeVisible();
        await expect(funding.funderSearchInput(addPanel)).toHaveCount(0);
        await funding.deleteChosenFunderButton(addPanel).click();
        await expect(funding.funderSearchInput(addPanel)).toBeVisible({timeout: 30_000});
        await expect(funding.funderNameBoxes(addPanel)).toHaveCount(0);
        await funding.pickTypedFunder(addPanel, nameA);
        await expect(funding.funderNameBoxes(addPanel).first()).toHaveValue(nameA);

        // The grants: one row with a malformed DOI is refused on the cell
        // with Save disabled; the DOI corrected, a blank second row added,
        // Save closes the panel and the row shows the funder (Fields;
        // Rule 5).
        await funding.addGrantRow(addPanel, {
            grantName: 'Field Study',
            grantNumber: '1234',
            grantDoi: 'not-a-doi',
        });
        await funding.saveRefused(addPanel, funding.grantDoiError(addPanel));
        await expect(funding.grantDoiError(addPanel)).toContainText(DOI_FORMAT);
        await addPanel.locator('input[name="grantDoi"]').last().fill('10.1234/example');
        await expect(funding.saveButton(addPanel)).toBeEnabled({timeout: 30_000});
        await funding.addGrantRow(addPanel);
        await expect(funding.grantRows(addPanel)).toHaveCount(2);
        await funding.savePanel(addPanel);
        await expect(funding.row(nameA)).toBeVisible({timeout: 30_000});

        // A second typed-name funder stands in for the registry funder
        // (A3 🐞 — see the file header) in Ordering and Delete below.
        await funding.addFunder(nameB);

        // Ordering: move the stand-in up, save the order, reload: it is
        // still listed first (Rule 7).
        await orderFirst(page, funding, nameB);
        funding = await openFunding(page, JOURNAL, submissionId);
        await expect(funding.rows().first()).toContainText(nameB, {timeout: 30_000});
        await expect(funding.rows().nth(1)).toContainText(nameA);

        // Edit: the panel is titled "Edit Funder", prefilled with the name
        // and the one grant row, the blank second row gone; the grant
        // number changed and saved; reopened, "5678" is there; Cancel
        // (Fields; Rule 5).
        await funding.openRowAction(nameA, 'Edit');
        let editPanel = funding.dialog('Edit Funder');
        await expect(editPanel).toBeVisible({timeout: 30_000});
        await expect(funding.funderNameBoxes(editPanel).first()).toHaveValue(nameA);
        await expect(funding.grantRows(editPanel)).toHaveCount(1);
        await expect(editPanel.locator('input[name="grantName"]')).toHaveValue('Field Study');
        await expect(editPanel.locator('input[name="grantNumber"]')).toHaveValue('1234');
        await expect(editPanel.locator('input[name="grantDoi"]')).toHaveValue('10.1234/example');
        await editPanel.locator('input[name="grantNumber"]').fill('5678');
        await funding.savePanel(editPanel);

        // Persistence read on a fresh load (reopening the panel in the same
        // breath can prefill from the store's copy before its refetch of
        // the saved list lands).
        funding = await openFunding(page, JOURNAL, submissionId);
        await funding.openRowAction(nameA, 'Edit');
        editPanel = funding.dialog('Edit Funder');
        await expect(editPanel.locator('input[name="grantNumber"]')).toHaveValue('5678', {
            timeout: 30_000,
        });
        // The panel offers no "Cancel": its only way out without saving is
        // the header's "Close" (T-ojs-2 in .reports/U43/test-ojs-findings.md).
        await editPanel.getByRole('button', {name: 'Close', exact: true}).click();
        await expect(editPanel).toHaveCount(0, {timeout: 30_000});

        // Delete: the confirmation's question; Cancel leaves the row; OK
        // removes it and the typed-name funder alone remains (Rule 6).
        await funding.openRowAction(nameB, 'Delete');
        let confirm = funding.deleteConfirmDialog();
        await expect(confirm).toBeVisible({timeout: 30_000});
        await expect(confirm).toContainText(
            'Are you sure you wish to delete this item? This action cannot be undone.'
        );
        await confirm.getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(confirm).toHaveCount(0, {timeout: 30_000});
        await expect(funding.row(nameB)).toBeVisible();

        await funding.openRowAction(nameB, 'Delete');
        confirm = funding.deleteConfirmDialog();
        await expect(confirm).toBeVisible({timeout: 30_000});
        const deleted = page.waitForResponse(
            (r) =>
                r.url().includes('/funders/') &&
                r.request().method() === 'POST' &&
                r.ok(),
            {timeout: 30_000}
        );
        await confirm.getByRole('button', {name: 'OK', exact: true}).click();
        await deleted;
        await expect(funding.row(nameB)).toHaveCount(0, {timeout: 30_000});
        await expect(funding.row(nameA)).toBeVisible();
        await expect(funding.rows()).toHaveCount(1);

        // Nothing else happens: the Activity Log has no new entry from the
        // adds, edits, deletes and reorders (Side effects) …
        expect(await activityLogRowCount(pub)).toBe(logBefore);

        // Control: a Title & Abstract save on this same submission writes
        // one "Submission metadata updated" entry.
        await pub.openEntry('Title & Abstract');
        await pub.setRichText('titleAbstract-subtitle-control-en', `Control ${tag}`);
        await pub.save();
        expect(await activityLogRowCount(pub)).toBe(logBefore + 1);

        // … and no email arrived in the mail catcher for the submitter,
        // read after the control mail the test sends the same way (A8).
        await expectNoMailToSubmitter(page, pkpMail, {
            tag,
            controlSubmissionId: control.submissionId,
            author,
            spare,
        });
    });

    test('S2: declare funding while submitting', {tag: '@smoke'}, async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const {submissionId} = await ojsApi.createSubmission({
            tag,
            context: JOURNAL,
            submitter: 'author.alex',
            title: `Submission ${tag}`,
            submitted: false,
        });
        const funderName = `Test Foundation ${tag}`;

        // The author walks the wizard to Details; the journal sits at the
        // default "ask" level, so the step carries a Funders section.
        const authorPage = await (await asUser('author.alex')).newPage();
        await stubRegistrySearch(authorPage);
        const wizard = new SubmissionWizardPage(authorPage, JOURNAL);
        await wizard.goto(submissionId);
        await wizard.expectStep('Upload Files');
        await wizard.uploadFile();
        await wizard.continueTo('Details');

        // The Details step: its last section is "Funders" (Rule 10) and,
        // the control, its table reads "No funders have been added."
        // before the add (Rules 3, 10).
        const wizardFunding = new FundingScreen(authorPage);
        await expect(wizardFunding.table()).toBeVisible({timeout: 30_000});
        await expect(wizardFunding.wizardFundersSection()).toHaveCount(1);
        await expect(wizardFunding.wizardSections().last()).toContainText('Funders');
        await expect(wizardFunding.table()).toContainText(EMPTY_LIST);

        // Record scenario 1's typed-name funder: on OJS the section's table
        // updates in place after the save (the stale table is A4's, a
        // press/preprint-server matter).
        await wizardFunding.addFunder(funderName);
        await expect(wizardFunding.table()).not.toContainText(EMPTY_LIST);

        // The Review step lists the funder's name under Details; complete
        // the submission (Rule 10).
        await wizard.continueTo('Contributors');
        await wizard.continueTo('For the Editors');
        await wizard.continueToReview(submissionId);
        await expect(wizard.reviewPanel('Details')).toContainText('Funders');
        await expect(wizard.reviewPanel('Details')).toContainText(funderName);
        await wizard.submitAndConfirm();

        // The Journal Manager's list: the author's funder is on the new
        // submission's Funding screen (Rule 1: one list per submission).
        const managerPage = await (await asUser('manager.maya')).newPage();
        const funding = await openFunding(managerPage, JOURNAL, submissionId);
        await expect(funding.row(funderName)).toBeVisible({timeout: 30_000});
        await expect(funding.rows()).toHaveCount(1);
    });

    test('S3: read a published article\'s funding', async ({asUser, ojsApi, page}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const controlTag = `${tag}c`;
        const [withFunder, noFunder] = await Promise.all([
            ojsApi.createSubmission({
                tag,
                context: JOURNAL,
                submitter: 'author.alex',
                title: `Submission ${tag}`,
                decisions: ['skipExternalReview', 'sendToProduction'],
                published: true,
            }),
            ojsApi.createSubmission({
                tag: controlTag,
                context: JOURNAL,
                submitter: 'author.alex',
                title: `Submission ${controlTag}`,
                decisions: ['skipExternalReview', 'sendToProduction'],
                published: true,
            }),
        ]);
        const testFoundation = `Test Foundation ${tag}`;
        const secondFoundation = `Second Foundation ${tag}`;
        const grantName = 'Field Study';
        const grantNumber = '1234';
        const grantDoi = '10.1234/example';

        // The manager records the two hand-named funders on the published
        // item (publishing does not lock the list — Actors & permissions),
        // the first with its grant, then orders "Second Foundation" first
        // with "Order" / "Save Order" (footnote s3). Typed-name path only:
        // the registry funder cannot be produced here (A3 🐞, the file
        // header), so Rule 9's ROR-mark link stays uncovered.
        const managerPage = await (await asUser('manager.maya')).newPage();
        await stubRegistrySearch(managerPage);
        let funding = await openFunding(managerPage, JOURNAL, withFunder.submissionId);
        await funding.addFunder(testFoundation, {
            grants: [{grantName, grantNumber, grantDoi}],
        });
        await funding.addFunder(secondFoundation);
        await orderFirst(managerPage, funding, secondFoundation);
        funding = await openFunding(managerPage, JOURNAL, withFunder.submissionId);
        await expect(funding.rows().first()).toContainText(secondFoundation, {timeout: 30_000});

        // The "Funders" block: the anonymous reader's landing page lists
        // "Test Foundation" with its grant's name, "Grant Number" and the
        // number, "Grant DOI" and the DOI as a working link (Rule 9).
        await page.goto(`/index.php/${JOURNAL}/article/view/${withFunder.submissionId}`);
        const landing = landingFunders(page);
        await expect(landing.heading).toBeVisible({timeout: 30_000});
        await expect(landing.block).toContainText(testFoundation);
        await expect(landing.block).toContainText(grantName);
        await expect(landing.block).toContainText(`Grant Number ${grantNumber}`);
        await expect(landing.block).toContainText('Grant DOI');
        const doiLink = landing.block.getByRole('link', {name: `https://doi.org/${grantDoi}`});
        await expect(doiLink).toHaveAttribute('href', `https://doi.org/${grantDoi}`);

        // The saved order: "Second Foundation" is listed before "Test
        // Foundation" (Rule 7).
        await expect(landing.funderNames).toHaveCount(2);
        await expect(landing.funderNames.nth(0)).toContainText(secondFoundation);
        await expect(landing.funderNames.nth(1)).toContainText(testFoundation);

        // Control: the published article with no funders shows no
        // "Funders" section at all — bounded by the page having rendered
        // (its title), the same way the presence leg was read (Rule 9).
        await page.goto(`/index.php/${JOURNAL}/article/view/${noFunder.submissionId}`);
        await expect(
            page.getByRole('heading', {name: `Submission ${controlTag}`})
        ).toBeVisible({timeout: 30_000});
        await expect(landingFunders(page).block).toHaveCount(0);
    });

    test('S4: the journal opts out', async ({asUser, ojsApi, page}, testInfo) => {
        test.slow();
        test.setTimeout(420_000);
        const tag = makeTag('s4', testInfo);
        // Scratch journal (the setting is mutated) with throwaway users; a
        // published scratch submission (the landing-page read needs a
        // page) and the throwaway Author's draft (footnote s4).
        const {manager, author} = await seedJournal(ojsApi, tag);
        const [{submissionId}, draft] = await Promise.all([
            ojsApi.createSubmission({
                tag: `${tag}s`,
                context: tag,
                submitter: author,
                title: `Submission ${tag}s`,
                decisions: ['skipExternalReview', 'sendToProduction'],
                published: true,
            }),
            ojsApi.createSubmission({
                tag: `${tag}d`,
                context: tag,
                submitter: author,
                title: `Submission ${tag}d`,
                submitted: false,
            }),
        ]);
        const funderName = `Test Foundation ${tag}`;

        // Control (and the funder every later read rides on): while the
        // journal sits at its "Ask…" start, the published submission's
        // Publication area shows "Funding" (openFunding opens it) and the
        // manager records the funder there (Rule 2).
        const managerPage = await (await asUser(manager)).newPage();
        await stubRegistrySearch(managerPage);
        let funding = await openFunding(managerPage, tag, submissionId);
        await funding.addFunder(funderName);

        // Control: the Author's draft, its file uploaded (footnote s4: at
        // "Require" the funders warning must be the only notice), walked to
        // the Details step, ends with its Funders section (Rule 2).
        const authorPage = await (await asUser(author)).newPage();
        await stubRegistrySearch(authorPage);
        const wizard = new SubmissionWizardPage(authorPage, tag);
        const wizardFunding = new FundingScreen(authorPage);
        await wizard.goto(draft.submissionId);
        await wizard.expectStep('Upload Files');
        await wizard.uploadFile();
        await wizard.continueTo('Details');
        await expect(wizardFunding.wizardFundersSection()).toHaveCount(1);
        await expect(wizardFunding.wizardSections().last()).toContainText('Funders');

        // The setting off: untick "Enable funder metadata" and save: the
        // workflow's Publication area offers no "Funding" entry — bounded
        // by its sibling "Title & Abstract" entry rendering (Rule 2).
        await openMetadataSettings(managerPage, tag);
        await managerPage.getByRole('checkbox', {name: 'Enable funder metadata'}).uncheck();
        await saveMetadataSettings(managerPage);
        // (A published item's workflow opens on a Publication page with no
        // "Workflow:" heading, so the open waits on the Publication menu.)
        await new PublicationScreen(managerPage, tag).gotoWorkflow(submissionId);
        const noFunding = new FundingScreen(managerPage);
        await expect(
            managerPage.getByRole('link', {name: 'Title & Abstract', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expect(noFunding.fundingMenuLink()).toHaveCount(0);

        // The wizard with the setting off: the Details step carries no
        // Funders section — bounded by the step being current with its
        // other sections on screen (Rule 2).
        await reopenAtDetails(wizard, draft.submissionId);
        await expect(wizardFunding.wizardSections().first()).toBeVisible({timeout: 30_000});
        await expect(wizardFunding.wizardFundersSection()).toHaveCount(0);

        // The published page with the setting off: the landing page still
        // lists the funder (Rule 2; Rule 9).
        await page.goto(`/index.php/${tag}/article/view/${submissionId}`);
        const landing = landingFunders(page);
        await expect(landing.heading).toBeVisible({timeout: 30_000});
        await expect(landing.funderNames).toHaveText([funderName]);

        // The setting on again: re-tick and save on "Do not request…"
        // (picked here, whatever arrived preselected — A8 ❓ stays
        // unasserted): Rule 2's enabled level — the "Funding" entry is
        // back and the Author's Details step still has no Funders section.
        await openMetadataSettings(managerPage, tag);
        await managerPage.getByRole('checkbox', {name: 'Enable funder metadata'}).check();
        await managerPage
            .getByRole('radio', {
                name: 'Do not request funder metadata from the author during submission.',
            })
            .check();
        await saveMetadataSettings(managerPage);
        funding = await openFunding(managerPage, tag, submissionId);
        await expect(funding.row(funderName)).toBeVisible({timeout: 30_000});
        await reopenAtDetails(wizard, draft.submissionId);
        await expect(wizardFunding.wizardSections().first()).toBeVisible({timeout: 30_000});
        await expect(wizardFunding.wizardFundersSection()).toHaveCount(0);

        // "Ask" again: both surfaces are back, the "Funding" entry with its
        // funder intact and the Funders section on the Details step (Rule 2).
        await openMetadataSettings(managerPage, tag);
        await managerPage
            .getByRole('radio', {name: 'Ask the author for funder metadata during submission.'})
            .check();
        await saveMetadataSettings(managerPage);
        funding = await openFunding(managerPage, tag, submissionId);
        await expect(funding.row(funderName)).toBeVisible({timeout: 30_000});
        await reopenAtDetails(wizard, draft.submissionId);
        await expect(wizardFunding.wizardFundersSection()).toBeVisible({timeout: 30_000});
        await expect(wizardFunding.table()).toContainText(EMPTY_LIST);

        // "Require": pick the require level and save (Settings).
        await openMetadataSettings(managerPage, tag);
        await managerPage
            .getByRole('radio', {
                name: 'Require the author to add funder metadata before accepting their submission.',
            })
            .check();
        await saveMetadataSettings(managerPage);

        // The Review step at "Require": the draft, with no funder declared,
        // walked on to Review shows "Funders are required." (Rule 11). The
        // submit's state is A1 ❓ and is not asserted.
        await reopenAtDetails(wizard, draft.submissionId);
        await wizard.continueTo('Contributors');
        await wizard.continueTo('For the Editors');
        await wizard.continueToReview(draft.submissionId);
        await expect(wizardFunding.fundersRequiredWarning()).toBeVisible({timeout: 30_000});
        await expect(wizardFunding.fundersRequiredWarning()).toContainText(FUNDERS_REQUIRED);
        await expect(wizard.reviewPanel('Details')).toContainText('Funders');
    });

    test('S5: the read-only list', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s5', testInfo);
        const {submissionId} = await ojsApi.createSubmission({
            tag,
            context: JOURNAL,
            submitter: 'author.alex',
            title: `Submission ${tag}`,
        });
        const funderName = `Test Foundation ${tag}`;

        // Control (Rule 8's editable side): the Journal Manager records the
        // funder and their "Funding" on the same submission offers "Add
        // Funder", "Order" and the row's "…" menu with "Edit" and "Delete"
        // (Rules 3, 4).
        const managerPage = await (await asUser('manager.maya')).newPage();
        await stubRegistrySearch(managerPage);
        const managerFunding = await openFunding(managerPage, JOURNAL, submissionId);
        await managerFunding.addFunder(funderName);
        await expect(managerFunding.addFunderButton()).toBeEnabled();
        await expect(managerFunding.orderButton()).toBeEnabled();
        await expect(managerFunding.rowMoreActions(funderName)).toBeVisible();
        const items = await managerFunding.openRowMenu(funderName);
        await expect(items).toHaveText(['Edit', 'Delete']);
        await managerFunding.closeRowMenu();

        // The Author's list: the same list on the Author's own submission
        // shows the row with "Add Funder" and "Order" grayed out and no "…"
        // menu on the row (Rule 8; Actors row 2; the editable author is
        // OPS1's, a preprint-server matter).
        const authorPage = await (await asUser('author.alex')).newPage();
        const authorFunding = await openFunding(authorPage, JOURNAL, submissionId, {
            author: true,
        });
        await expect(authorFunding.row(funderName)).toBeVisible({timeout: 30_000});
        await expect(authorFunding.rows()).toHaveCount(1);
        await expect(authorFunding.addFunderButton()).toBeDisabled();
        await expect(authorFunding.orderButton()).toBeDisabled();
        await expect(authorFunding.rowMoreActions(funderName)).toHaveCount(0);
    });

    test('S6: the reviewer\'s browser never receives the funders list', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s6', testInfo);
        // Two scratch journals: one at the install defaults ("Anonymous
        // Reviewer/Anonymous Author"), one whose default review type is
        // "Open"; each with a submission in review, the Reviewer's accepted
        // request on it and one hand-named funder recorded through the
        // workflow panel by the journal's manager (footnote s6).
        const seedJournalInReview = async (path, options) => {
            const {manager, reviewer, author} = await seedJournal(ojsApi, path, {
                reviewer: true,
                ...options,
            });
            const {submissionId} = await ojsApi.createSubmission({
                tag: `${path}s`,
                context: path,
                submitter: author,
                title: `Submission ${path}s`,
                decisions: ['sendExternalReview'],
                reviewRounds: [{reviewers: [{username: reviewer, status: 'accepted'}]}],
            });
            const funderName = `Test Foundation ${path}`;
            const managerPage = await (await asUser(manager)).newPage();
            await stubRegistrySearch(managerPage);
            const funding = await openFunding(managerPage, path, submissionId);
            await funding.addFunder(funderName);

            // Control (Rules 1, 3): the manager's "Funding" on the same
            // submission, reopened, shows the "Test Foundation" row, and
            // the screen's own request for the submission
            // (`GET …/api/v1/submissions/{id}`, the workflow's fetch on
            // opening — the page's own traffic, read with a listener armed
            // before the open) carries the name.
            const submissionFetched = managerPage.waitForResponse(
                (r) =>
                    new RegExp(`/api/v1/submissions/${submissionId}(\\?|$)`).test(r.url()) &&
                    r.request().method() === 'GET' &&
                    r.ok(),
                {timeout: 30_000}
            );
            const reopened = await openFunding(managerPage, path, submissionId);
            await expect(reopened.row(funderName)).toBeVisible({timeout: 30_000});
            const submissionPayload = await (await submissionFetched).text();
            expect(submissionPayload).toContain(funderName);
            await managerPage.close();
            return {path, reviewer, submissionId, funderName};
        };
        const [anonymous, open] = await Promise.all([
            seedJournalInReview(`${tag}a`),
            seedJournalInReview(`${tag}o`, {review: {defaultReviewMode: 'open'}}),
        ]);

        /**
         * As the Reviewer, open the request from the reviewer dashboard:
         * the review screen shows no funders list (bounded by the review
         * page's own heading), and the publication the page fetches for
         * "View All Submission Details" (`GET …/submissions/{id}/
         * publications/{id}`, the page's own traffic — the shape U41's
         * S11 reads) is returned for the payload reads below.
         */
        const fetchedPublication = async ({path, reviewer, submissionId, funderName}) => {
            const page = await (await asUser(reviewer)).newPage();
            const list = new ReviewerAssignmentsPage(page, path);
            await list.goto('actionRequired');
            const row = list.row(`Submission ${path}s`);
            await expect(row).toBeVisible({timeout: 30_000});
            await list.openWizard(row, 'Finish review');
            const wizard = new ReviewWizardPage(page, path);
            await wizard.expectOpen();
            await expect(page.getByRole('table', {name: 'Funders', exact: true})).toHaveCount(0);
            await expect(page.getByText(funderName)).toHaveCount(0);
            const fetched = page.waitForResponse(
                (r) =>
                    r.url().includes(`/submissions/${submissionId}/publications/`) &&
                    r.request().method() === 'GET' &&
                    r.ok(),
                {timeout: 30_000}
            );
            const details = await wizard.openSubmissionDetails();
            const publication = await (await fetched).json();
            await expect(details).not.toContainText(funderName);
            await wizard.closeDialog(details);
            return publication;
        };

        // The anonymous assignment: the data's funders list is empty and
        // the funder's name appears nowhere in it (Rule 13).
        const withheld = await fetchedPublication(anonymous);
        expect(withheld.funders ?? []).toEqual([]);
        expect(JSON.stringify(withheld)).not.toContain(anonymous.funderName);

        // The open assignment: the same walk — the screen and the window
        // show no funders list (fetchedPublication asserts both), and the
        // publication the window requests likewise carries no funders list
        // (Rule 13; the funders list lives on the submission payload, which
        // no reviewer screen requests — T-ojs-1). The contributor reads are
        // extra evidence that the open payload is the un-anonymized one.
        const full = await fetchedPublication(open);
        expect(full.funders ?? []).toEqual([]);
        expect(JSON.stringify(full)).not.toContain(open.funderName);
        expect(withheld.authors).toEqual([]);
        expect(full.authors).toHaveLength(1);
        expect(full.authors[0].fullName).toBe('Ada Author');
        const facts = testInfo.outputPath('publication-payload-facts.json');
        fs.writeFileSync(
            facts,
            JSON.stringify(
                {
                    anonymous: {
                        hasFundersKey: 'funders' in withheld,
                        funders: withheld.funders ?? null,
                        authors: withheld.authors,
                    },
                    open: {
                        hasFundersKey: 'funders' in full,
                        funders: full.funders ?? null,
                        authors: full.authors.map((a) => a.fullName),
                    },
                },
                null,
                2
            )
        );
        await testInfo.attach('publication-payload-facts', {path: facts, contentType: 'application/json'});
    });
});
