// @ts-check
/**
 * @file playwright/tests/U31-reviewer-suggestions.spec.js
 *
 * Reviewer suggestions — OMP suite, one test per canonical scenario the spec
 * runs on a press, in OMP vocabulary (press, Press Manager, monograph,
 * External Review, the "External Reviewer" role): the common scenarios 1–4
 * on External Review round 1, plus the press's own scenario 5 (Internal
 * Review offers the list without the panel, OMP1). Scenario 6 is OPS's.
 * Spec: docs/specs/U31-reviewer-suggestions.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap):
 * - A1 🐞: S4 walks the Funding Coordinator onto the Submission and External
 *   Review stages and presses "OK" on the "Error" dialog when it is there;
 *   that the dialog opens, and that no panel shows for the role, is the
 *   bug's record, asserted neither way. The suite asserts what the role IS
 *   offered next: the suggestions list inside Add Reviewer and the
 *   "Selected Reviewer" path that succeeds.
 * - A5 🐞: S4 presses the inner "Create New Reviewer" form's "Add Reviewer"
 *   as the Funding Coordinator, bounded by the grid's own answer, then closes
 *   the windows; the unresponsive form, and whether Nova stays pending for the
 *   Press Manager's control, are the bug's record, asserted neither way. The
 *   control asserts only what does not depend on it: no "Error" dialog for
 *   the manager, and Kay gone from the External Review panel (Rule 11) while
 *   still listed on the Submission stage (Rule 8a).
 * - OMP1 ❓: S5 asserts what the press shows (no panel on Internal Review, the
 *   list inside its Add Reviewer, the internal reviewer's suggestion gone
 *   from External Review); whether suggestions SHOULD reach Internal Review
 *   is the open question, asserted neither way.
 * - A4 ❓: S1 reads the author's view after "Submit" and asserts no panel on
 *   the stages it can open; whether the author SHOULD see their suggestions
 *   is the open question, not asserted either way.
 * - A6 🐞: S1 asserts the same-address refusal; the other-case acceptance is
 *   not driven.
 * - A7 🐞 / A11 🐞: S1 anchors the guidance text on its opening sentence and
 *   never on "valueable"; the reason box's help text is not asserted.
 * - A8 🐞: every "Select Reviewer" is found by its visible text, never by its
 *   accessible name.
 * - A9 🐞: S3 and S5 assert the entry's text leaves the list; the blank row
 *   it leaves behind is asserted neither way.
 * - A10 🐞: no test presses the inner window's "Back to Search".
 * - A2 ❓, A3 ❓ (ORCID box; a matched suggestion after unassign): none here —
 *   breadth is the spec's, depth the test's (PRINCIPLES M6).
 *
 * Seeding: scenario endpoints only. Every scenario runs on a scratch press
 * created with `review: {reviewerSuggestionEnabled: true}` and throwaway
 * users whose addresses carry app + test; publicknowledge (the setting off,
 * seed-facts) hosts only S1's control as author.alex, a seeded draft of its
 * own (A1: the press itself stays untouched). Suggestions on submitted
 * monographs come from `reviewerSuggestions[]`; an address once turned into
 * a reviewer holds the role for every submission of the press, so each
 * submission gets fresh addresses for the Create and Enroll paths, and a
 * typed username carries the tag (usernames are site-unique). Mailpit sits
 * at its cap, so mail is read per fresh recipient plus the tag-bearing
 * title (PRINCIPLES A8). Silence claims are bounded by the row, response or
 * landmark that would carry the effect. No hard-coded waits.
 */
const {test, expect} = require('../support/fixtures.js');
const appContext = require('../support/app.context.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {MySubmissionsPage} = require('../../../../shared/playwright/pages/MySubmissionsPage.js');
const {EditorialDashboardPage} = require('../../../../shared/playwright/pages/EditorialDashboardPage.js');
const {
    STEPS,
    wizardUrl,
    railEntry,
    expectStep,
    gotoStep,
    expectWizardOpen,
    continueTo,
    uploadWizardFile,
    openReview,
    confirmSubmit,
    saveForLater,
} = require('../pages/SubmissionWizardPages.js');
const {
    reviewerPanel,
    reviewerRow,
    openAddReviewer,
    searchReviewerList,
    reviewerListEntry,
} = require('../pages/ReviewerAssignmentPages.js');
const {decisionButton, walkDecisionWizard} = require('../pages/ReviewStagePages.js');
const {
    ReviewerSuggestionStep,
    ReviewerRequestWindow,
    SuggestedReviewersPanel,
    SuggestionList,
    DELETE_SUGGESTION_MESSAGE,
    ASSIGNED_NOTICE,
} = require('../../../../shared/playwright/pages/ReviewerSuggestionPages.js');

const PRESS = 'publicknowledge';
const PK_PREFIX = '/en';
const REVIEWER_ROLE = 'External Reviewer';
const REQUIRED = 'This field is required.';
const REVIEW_REQUEST_SUBJECT = 'Manuscript Review Request';
const WELCOME_SUBJECT = 'Registration as Reviewer';
const EXTERNAL_ROUND_1 = 'External Review (Round 1)';
const INTERNAL_ROUND_1 = 'Internal Review (Round 1)';

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u31${scenario}ompw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** The scenarios' people, as the spec names them (address per submission). */
const KAY = (email) => ({
    givenName: 'Kay',
    familyName: 'Suggested',
    email,
    affiliation: 'Public Knowledge University',
    suggestionReason: 'Expert in open access publishing; no conflict of interest.',
});
const LEE = (email) => ({
    givenName: 'Lee',
    familyName: 'Second',
    email,
    affiliation: 'Second University',
    suggestionReason: 'Knows the corpus.',
});
const NOVA = (email) => ({
    givenName: 'Nova',
    familyName: 'Newcomer',
    email,
    affiliation: 'Newcomer Institute',
    suggestionReason: 'Fresh eyes on the method.',
});
const PAT = (email) => ({
    givenName: 'Pat',
    familyName: 'Peer',
    email,
    affiliation: 'Peer College',
    suggestionReason: 'Has reviewed for us before.',
});
const KIM = (email) => ({
    givenName: 'Kim',
    familyName: 'Kept',
    email,
    affiliation: 'Kept Institute',
    suggestionReason: 'Still pending after the round.',
});

const fullName = (person) => `${person.givenName} ${person.familyName}`;
const mailOf = (username) => `${username}@mail.test`;

/** A scratch press with "Reviewer Suggestion at Submission" on. */
async function seedPress(ompApi, tag, users) {
    return ompApi.createContext({
        tag,
        review: {reviewerSuggestionEnabled: true},
        users,
    });
}

/** A monograph standing in External Review round 1 on the scratch press. */
async function seedInReview(ompApi, {tag, context, submitter, reviewers = [], reviewerSuggestions, participants}) {
    return ompApi.createSubmission({
        tag,
        context,
        submitter,
        title: `Submission ${tag}`,
        decisions: ['skipInternalReview'],
        reviewRounds: [{stage: 'external', reviewers}],
        ...(reviewerSuggestions ? {reviewerSuggestions} : {}),
        ...(participants ? {participants} : {}),
    });
}

/** The seeded round's menu key (`workflow_<stage>_<round id>`). */
const roundKey = (seed) => `workflow_${seed.reviewRounds[0].stageId}_${seed.reviewRounds[0].id}`;

/** The shared workflow frame with the press's labels ("External Review"). */
const workflowFor = (page, contextPath) => new WorkflowPage(page, contextPath, {appContext});

/**
 * The Reviewers panel's own "Add Reviewer" window, anchored on its
 * "Locate a Reviewer" list so the locator survives an inner window stacking
 * over it and closing again (the app helper's topModal would move).
 */
async function openAddReviewerWindow(page, workflow) {
    await openAddReviewer(page, workflow.dialog());
    const modal = page.getByRole('dialog').filter({has: page.locator('.listPanel--selectReviewer')});
    await expect(modal.locator('.listPanel--selectReviewer input.pkpSearch__input')).toBeVisible({timeout: 30_000});
    return modal;
}

/**
 * Land on a stage that may stack an "Error" dialog over the workflow (A1,
 * walked, never asserted): wait for the dialog or the landmark, and press
 * "OK" when the dialog is the one that came.
 */
async function landPastErrorDialog(page, landmark) {
    const error = page.getByRole('dialog', {name: 'Error', exact: true});
    await expect(error.or(landmark).first()).toBeVisible({timeout: 30_000});
    if (await error.count()) {
        await error.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(error).toBeHidden({timeout: 30_000});
    }
    await expect(landmark).toBeVisible({timeout: 30_000});
}

/**
 * The Reviewers panel's "Add Reviewer" as a role whose list fetch stacks the
 * "Error" dialog over the opening window (A1, walked): press it, dismiss the
 * dialog when it comes, and return the window once its search box is there.
 */
async function openAddReviewerPastErrorDialog(page) {
    await page.getByRole('button', {name: 'Add Reviewer', exact: true}).click();
    const modal = page.getByRole('dialog').filter({has: page.locator('.listPanel--selectReviewer')});
    await landPastErrorDialog(page, modal.locator('.listPanel--selectReviewer input.pkpSearch__input'));
    return modal;
}

/**
 * Close every open "Add Reviewer" window as the Funding Coordinator. On the
 * press the "Error" dialog (A1: the list's refresh answers 401) stacks over
 * the windows again after the inner form's "Add Reviewer", and its overlay
 * intercepts every click beneath it, so "OK" is pressed whenever it is the
 * topmost dialog, and the windows are closed in between.
 */
async function closeWindowsPastErrorDialog(page) {
    const error = page.getByRole('dialog', {name: 'Error', exact: true});
    while (await ReviewerRequestWindow.all(page).count()) {
        if (await error.count()) {
            await error.getByRole('button', {name: 'OK', exact: true}).click();
            await expect(error).toBeHidden({timeout: 30_000});
            continue;
        }
        await new ReviewerRequestWindow(page).close();
    }
    if (await error.count()) {
        await error.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(error).toBeHidden({timeout: 30_000});
    }
}

test.describe('reviewer-suggestions', () => {
    test('S1: the author suggests reviewers on a draft', {tag: '@smoke'}, async ({asUser, ompApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s1', testInfo);
        const author = `au${tag}`;
        const manager = `mgr${tag}`;
        const kayEmail = 'kay.suggested@mail.test';
        const leeEmail = 'lee.second@mail.test';
        await seedPress(ompApi, tag, [
            {username: author, roles: ['author'], givenName: 'Ava', familyName: 'Author'},
            {username: manager, roles: ['manager'], givenName: 'Mira', familyName: 'Manager'},
        ]);
        const {submissionId} = await ompApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            title: `Submission ${tag}`,
            submitted: false,
        });
        // The same author's second draft, for "Submit" with no suggestion
        // (its title carries the tag apart from the first's, so a row read
        // by "Submission {tag}" stays unique).
        const second = await ompApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            title: `Second draft ${tag}`,
            submitted: false,
        });

        const authorPage = await (await asUser(author)).newPage();
        const step = new ReviewerSuggestionStep(authorPage);
        await authorPage.goto(wizardUrl(tag, submissionId));
        await expectWizardOpen(authorPage);

        // The step sits between "For the Editors" and "Review" on the rail.
        const rail = (await authorPage.locator('.pkpSteps__step__label').allTextContents()).map((t) =>
            t.replace(/\s+/g, ' ').replace(/^\d+\s*/, '').trim()
        );
        const at = rail.indexOf(STEPS.reviewerSuggestions);
        expect(at, `rail: ${rail.join(' | ')}`).toBeGreaterThan(0);
        expect(rail[at - 1]).toBe(STEPS.editors);
        expect(rail[at + 1]).toBe(STEPS.review);

        // A seeded draft needs a file before "Submit" passes (scenarios.md).
        await uploadWizardFile(authorPage, `${tag}.txt`);
        await continueTo(authorPage, STEPS.details);
        await continueTo(authorPage, STEPS.contributors);
        await continueTo(authorPage, STEPS.editors);
        await continueTo(authorPage, STEPS.reviewerSuggestions);

        // Guidance above the panel; the empty panel with its button.
        await expect(step.guidance()).toBeVisible();
        await expect(step.panelHeading()).toBeVisible();
        await expect(step.addButton()).toBeVisible();
        await expect(step.emptyText()).toBeVisible();
        await expect(step.entries()).toHaveCount(0);

        // The Review step's block warns, and its "Edit" returns to the step.
        await openReview(authorPage);
        await expect(step.reviewBlockWarning()).toBeVisible();
        await expect(step.reviewBlockEntries()).toHaveCount(0);
        await step.reviewBlockEditButton().click();
        await gotoStep(authorPage, STEPS.reviewerSuggestions);

        // "Save" with every box empty: four required messages, the summary,
        // and "Save" held. Changing one flagged box clears that box's error
        // and leaves "Save" held; it comes back once every flagged box has
        // changed (the OJS run showed this: finding T-ojs-1; this run reads
        // the same screen on the press).
        const kay = KAY(kayEmail);
        const addWindow = await step.openAdd();
        await addWindow.saveButton().click();
        await expect(addWindow.errorSummary()).toHaveText(/Please correct 4 errors\./);
        await expect(addWindow.jumpToNextErrorButton()).toBeVisible();
        for (const label of ['Given Name', 'Email', 'Affiliation', 'Reasons for suggesting reviewer']) {
            await expect(addWindow.fieldError(label), label).toHaveText(REQUIRED);
        }
        await expect(addWindow.fieldErrors().filter({hasText: REQUIRED})).toHaveCount(4);
        await expect(addWindow.saveButton()).toBeDisabled();
        await addWindow.givenName().fill(kay.givenName);
        await expect(addWindow.fieldError('Given Name')).toHaveCount(0);
        await expect(addWindow.fieldErrors().filter({hasText: REQUIRED})).toHaveCount(3);
        await expect(addWindow.errorSummary()).toHaveText(/Please correct 3 errors\./);
        await expect(addWindow.saveButton()).toBeDisabled();
        await addWindow.fill({familyName: kay.familyName, email: kay.email, affiliation: kay.affiliation});
        await expect(addWindow.fieldErrors().filter({hasText: REQUIRED})).toHaveCount(1);
        await expect(addWindow.saveButton()).toBeDisabled();
        await addWindow.fill({reason: kay.suggestionReason});
        await expect(addWindow.fieldErrors().filter({hasText: REQUIRED})).toHaveCount(0);
        await expect(addWindow.saveButton()).toBeEnabled();

        // Kay: saved, listed with badge, address and the two controls.
        await addWindow.save();
        const kayEntry = step.entry(kayEmail);
        await expect(kayEntry).toBeVisible();
        await expect(kayEntry).toContainText(fullName(kay));
        await expect(kayEntry).toContainText(kay.affiliation);
        await expect(step.editButton(kayEntry)).toBeVisible();
        await expect(step.deleteButton(kayEntry)).toBeVisible();
        await expect(step.emptyText()).toHaveCount(0);

        // Lee, the same way.
        const lee = LEE(leeEmail);
        const addLee = await step.openAdd();
        await addLee.fill({
            givenName: lee.givenName,
            familyName: lee.familyName,
            email: lee.email,
            affiliation: lee.affiliation,
            reason: lee.suggestionReason,
        });
        await addLee.save();
        await expect(step.entry(leeEmail)).toContainText(fullName(lee));
        await expect(step.entries()).toHaveCount(2);

        // A third with Kay's address is refused; the panel keeps two.
        const addDup = await step.openAdd();
        await addDup.fill({
            givenName: lee.givenName,
            familyName: lee.familyName,
            email: kayEmail,
            affiliation: lee.affiliation,
            reason: lee.suggestionReason,
        });
        await addDup.saveButton().click();
        await expect(addDup.fieldError('Email')).toHaveText('The email has already been taken.');
        await expect(addDup.saveButton()).toBeDisabled();
        await expect(step.entries()).toHaveCount(2);
        await addDup.close();
        await expect(step.entries()).toHaveCount(2);

        // Edit Kay: the window is titled "Edit", prefilled. Closed without
        // "Save" after a change: no warning (no dialog is left once the
        // window is gone; the Delete dialog below is the positive control,
        // read the same way) and the badge is unchanged.
        const edit = await step.openEdit(step.entry(kayEmail));
        await expect(edit.givenName()).toHaveValue(kay.givenName);
        await expect(edit.familyName()).toHaveValue(kay.familyName);
        await expect(edit.email()).toHaveValue(kayEmail);
        await expect(edit.affiliation()).toHaveValue(kay.affiliation);
        await expect(edit.reasonBody()).toContainText(kay.suggestionReason);
        await edit.affiliation().fill('Open University');
        await edit.close();
        await expect(authorPage.getByRole('dialog')).toHaveCount(0);
        await expect(step.entry(kayEmail)).toContainText(kay.affiliation);
        await expect(step.entry(kayEmail)).not.toContainText('Open University');

        // "Edit" again, change and "Save": the badge changes.
        const editAgain = await step.openEdit(step.entry(kayEmail));
        await expect(editAgain.affiliation()).toHaveValue(kay.affiliation);
        await editAgain.affiliation().fill('Open University');
        await editAgain.save();
        await expect(step.entry(kayEmail)).toContainText('Open University');
        await expect(step.entry(kayEmail)).not.toContainText(kay.affiliation);

        // Delete Lee: "Cancel" keeps the entry, confirming removes it.
        const keep = await step.openDelete(step.entry(leeEmail));
        await expect(keep).toContainText(DELETE_SUGGESTION_MESSAGE);
        await keep.getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(keep).toBeHidden();
        await expect(step.entry(leeEmail)).toHaveCount(1);
        const confirm = await step.openDelete(step.entry(leeEmail));
        await confirm.getByRole('button', {name: 'Delete Reviewer Suggestion', exact: true}).click();
        await expect(confirm).toBeHidden();
        await expect(step.entry(leeEmail)).toHaveCount(0);
        await expect(step.entries()).toHaveCount(1);

        // "Save for Later", then reopen from My Submissions: Kay is listed again.
        await saveForLater(authorPage);
        const mine = new MySubmissionsPage(authorPage, tag);
        await mine.goto();
        await mine.searchFor(tag);
        const draftRow = mine.row(`Submission ${tag}`);
        await expect(draftRow).toBeVisible({timeout: 30_000});
        await mine.completeSubmissionButton(draftRow).click();
        await expectWizardOpen(authorPage);
        await gotoStep(authorPage, STEPS.reviewerSuggestions);
        await expect(step.entry(kayEmail)).toContainText(fullName(kay));
        await expect(step.entries()).toHaveCount(1);

        // The Press Manager on the draft: the Editor Dashboard's "All in
        // submission stage" view lists it as "Incomplete" with one button,
        // "Complete submission", which opens the draft's wizard; its step
        // lists Kay with "Edit" and "Delete" and offers "Add Reviewer
        // Suggestion". The author's session stays on the draft meanwhile.
        const managerPage = await (await asUser(manager)).newPage();
        const dash = new EditorialDashboardPage(managerPage, tag);
        await dash.goto();
        await dash.openView('All in submission stage');
        await dash.searchFor(tag);
        const draftRowForManager = dash.row(`Submission ${tag}`);
        await expect(draftRowForManager).toBeVisible({timeout: 30_000});
        await expect(dash.stageCell(draftRowForManager)).toHaveText(/Incomplete/);
        await expect(dash.completeSubmissionButton(draftRowForManager)).toBeVisible();
        await expect(dash.viewButton(draftRowForManager)).toHaveCount(0);
        await expect(draftRowForManager.getByRole('button')).toHaveCount(1);
        await dash.completeSubmissionButton(draftRowForManager).click();
        await managerPage.waitForURL(/\/submission\?id=\d+/, {waitUntil: 'commit', timeout: 30_000});
        await expectWizardOpen(managerPage);
        const managerStep = new ReviewerSuggestionStep(managerPage);
        await gotoStep(managerPage, STEPS.reviewerSuggestions);
        await expect(managerStep.entries()).toHaveCount(1);
        const kayForManager = managerStep.entry(kayEmail);
        await expect(kayForManager).toContainText(fullName(kay));
        await expect(managerStep.editButton(kayForManager)).toBeVisible();
        await expect(managerStep.deleteButton(kayForManager)).toBeVisible();
        await expect(managerStep.addButton()).toBeVisible();

        // The Review step's block: name, address, affiliation, no reason.
        await openReview(authorPage);
        await expect(step.reviewBlockEditButton()).toBeVisible();
        await expect(step.reviewBlockEntries()).toHaveCount(1);
        const block = step.reviewBlock();
        await expect(block).toContainText(fullName(kay));
        await expect(block).toContainText(kayEmail);
        await expect(block).toContainText('Open University');
        await expect(block).not.toContainText(kay.suggestionReason);
        await expect(step.reviewBlockWarning()).toHaveCount(0);

        // Submit: the submission is in.
        await confirmSubmit(authorPage);

        // The second draft, nothing added on its step: the Review step's
        // block warns, and "Submit" goes through.
        await authorPage.goto(wizardUrl(tag, second.submissionId));
        await expectWizardOpen(authorPage);
        await uploadWizardFile(authorPage, `${tag}b.txt`);
        await continueTo(authorPage, STEPS.details);
        await continueTo(authorPage, STEPS.contributors);
        await continueTo(authorPage, STEPS.editors);
        await continueTo(authorPage, STEPS.reviewerSuggestions);
        await expect(step.emptyText()).toBeVisible();
        await expect(step.entries()).toHaveCount(0);
        await openReview(authorPage);
        await expect(step.reviewBlockWarning()).toBeVisible();
        await expect(step.reviewBlockEntries()).toHaveCount(0);
        await confirmSubmit(authorPage);

        // The author's view of the first submission, opened from My
        // Submissions, shows no suggestions panel on any stage the menu
        // lists (the stage heading is each read's landmark).
        const authorWorkflow = workflowFor(authorPage, tag);
        const authorPanel = new SuggestedReviewersPanel(authorPage);
        await mine.goto();
        await mine.searchFor(tag);
        const submittedRow = mine.row(`Submission ${tag}`);
        await expect(submittedRow).toBeVisible({timeout: 30_000});
        await authorWorkflow.openFromRow(submittedRow, submissionId);
        await authorWorkflow.expectStageHeading('Submission');
        await expect(authorPanel.heading()).toHaveCount(0);
        const stages = await authorWorkflow.stageLabels();
        expect(stages, `author menu: ${stages.join(' | ')}`).toContain('External Review');
        for (const stage of stages.filter((label) => label !== 'Submission')) {
            await authorWorkflow.selectStage(stage);
            await expect(authorPanel.heading()).toHaveCount(0);
        }

        // Press Manager, Submission stage: the panel lists Kay, no action.
        const workflow = workflowFor(managerPage, tag);
        const panel = new SuggestedReviewersPanel(managerPage);
        await workflow.gotoEditorial(submissionId);
        await workflow.expectStageHeading('Submission');
        await panel.loaded();
        await expect(panel.heading()).toBeVisible();
        const kayRow = panel.row(fullName(kay));
        await expect(kayRow).toBeVisible();
        await expect(kayRow).toContainText('KS');
        await expect(kayRow).toContainText('Open University');
        await expect(kayRow).toContainText(kay.suggestionReason);
        await expect(kayRow.getByRole('button')).toHaveCount(0);
        await expect(panel.moreActionsButton(fullName(kay))).toHaveCount(0);
        await expect(managerPage.getByRole('button', {name: 'Ava Author More Actions', exact: true})).toBeVisible();

        // Control: on the seeded press (the setting off) a new draft's
        // wizard has no "Reviewer Suggestions" step.
        const control = await ompApi.createSubmission({
            tag: `${tag}c`,
            context: PRESS,
            submitter: 'author.alex',
            title: `Submission ${tag}c`,
            submitted: false,
        });
        const alexPage = await (await asUser('author.alex')).newPage();
        await alexPage.goto(wizardUrl(PRESS, control.submissionId, {localePrefix: PK_PREFIX}));
        await expectWizardOpen(alexPage);
        await expect(railEntry(alexPage, STEPS.editors)).toHaveCount(1);
        await expect(railEntry(alexPage, /Review\s*$/)).toHaveCount(1);
        await expect(railEntry(alexPage, STEPS.reviewerSuggestions)).toHaveCount(0);

        // … and on a monograph of the seeded press in External Review round
        // 1 (no suggestion can be seeded there) the Press Manager's
        // Submission and External Review stages show no "Reviewers
        // Suggested by Author" panel (Participants is the positive
        // control), and the Reviewers panel's "Add Reviewer" window opens
        // with "Locate a Reviewer" and no suggestions list.
        const controlInReview = await seedInReview(ompApi, {
            tag: `${tag}r`,
            context: PRESS,
            submitter: 'author.alex',
        });
        const mayaPage = await (await asUser('manager.maya')).newPage();
        const mayaWorkflow = workflowFor(mayaPage, PRESS);
        const mayaPanel = new SuggestedReviewersPanel(mayaPage);
        await mayaWorkflow.gotoEditorial(controlInReview.submissionId, {menuKey: 'workflow_1'});
        await mayaWorkflow.expectStageHeading('Submission');
        await expect(mayaWorkflow.participantsHeading()).toBeVisible();
        await expect(mayaPanel.heading()).toHaveCount(0);
        await mayaWorkflow.gotoEditorial(controlInReview.submissionId, {menuKey: roundKey(controlInReview)});
        await mayaWorkflow.expectStageHeading(EXTERNAL_ROUND_1);
        await expect(mayaWorkflow.participantsHeading()).toBeVisible();
        await expect(mayaPanel.heading()).toHaveCount(0);
        const mayaModal = await openAddReviewerWindow(mayaPage, mayaWorkflow);
        await expect(mayaModal.getByRole('heading', {name: 'Locate a Reviewer', exact: true})).toBeVisible();
        await expect(new SuggestionList(mayaPage, mayaModal).heading()).toHaveCount(0);
    });

    test('S2: the editor turns suggestions into reviewers from the panel', async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s2', testInfo);
        const manager = `mgr${tag}`;
        const author = `au${tag}`;
        const reviewerUser = `rev${tag}`;
        const readerUser = `rd${tag}`;
        const kay = KAY(mailOf(reviewerUser));
        const lee = LEE(mailOf(readerUser));
        const nova = NOVA(`nova.${tag}@mail.test`);
        const novaUsername = `nova${tag}`;
        const novaOtherEmail = `nova.other.${tag}@mail.test`;
        const novaOtherUsername = `novaother${tag}`;
        const kim = KIM(`kim.${tag}@mail.test`);
        await seedPress(ompApi, tag, [
            {username: manager, roles: ['manager'], givenName: 'Mira', familyName: 'Manager'},
            {username: author, roles: ['author'], givenName: 'Ava', familyName: 'Author'},
            {username: reviewerUser, roles: ['externalReviewer'], givenName: kay.givenName, familyName: kay.familyName},
            {username: readerUser, roles: ['reader'], givenName: lee.givenName, familyName: lee.familyName},
        ]);
        const seed = await seedInReview(ompApi, {
            tag,
            context: tag,
            submitter: author,
            reviewerSuggestions: [kay, lee, nova],
        });
        // A second monograph moved on to Copyediting after External Review
        // round 1, its one suggestion still pending (the U24 shape).
        const copyediting = await ompApi.createSubmission({
            tag: `${tag}k`,
            context: tag,
            submitter: author,
            title: `Submission ${tag}k`,
            decisions: ['sendExternalReview', 'accept'],
            reviewRounds: [{stage: 'external', reviewers: []}],
            reviewerSuggestions: [kim],
        });
        const control = await seedInReview(ompApi, {tag: `${tag}c`, context: tag, submitter: author});
        const {submissionId} = seed;
        const key = roundKey(seed);

        const page = await (await asUser(manager)).newPage();
        const workflow = workflowFor(page, tag);
        const panel = new SuggestedReviewersPanel(page);
        const reviewers = () => workflow.dialog();
        const names = [kay, lee, nova].map(fullName);

        // Submission stage: all three listed, no action on any row.
        await workflow.gotoEditorial(submissionId, {menuKey: 'workflow_1'});
        await workflow.expectStageHeading('Submission');
        await panel.loaded();
        await expect(panel.heading()).toBeVisible();
        await expect(panel.rows()).toHaveCount(3);
        for (const person of [kay, lee, nova]) {
            const row = panel.row(fullName(person));
            await expect(row).toContainText(`${person.givenName[0]}${person.familyName[0]}`);
            await expect(row).toContainText(person.affiliation);
            await expect(row).toContainText(person.suggestionReason);
            await expect(row.getByRole('button')).toHaveCount(0);
        }
        await expect(page.getByRole('button', {name: 'Ava Author More Actions', exact: true})).toBeVisible();

        // External Review: the same three, each with a "…" menu holding "Add Reviewer".
        await workflow.gotoEditorial(submissionId, {menuKey: key});
        await workflow.expectStageHeading(EXTERNAL_ROUND_1);
        await panel.loaded();
        await expect(panel.rows()).toHaveCount(3);
        for (const name of names) {
            await expect(panel.moreActionsButton(name)).toBeVisible();
        }
        const items = await panel.openMenu(fullName(kay));
        await expect(items).toHaveCount(1);
        await expect(items).toHaveText('Add Reviewer');

        // Kay (an External Reviewer account): "Selected Reviewer", no "Locate
        // a Reviewer", the "Review Request" message and both dates filled.
        // "Cancel" keeps her.
        await items.click();
        let request = new ReviewerRequestWindow(page);
        await request.expectOpen();
        await expect(request.selectedReviewerLabel()).toBeVisible();
        await expect(request.selectedReviewerName()).toHaveText(fullName(kay));
        await expect(request.dialog()).toContainText(kay.email);
        await expect(request.locateHeading()).toHaveCount(0);
        await expect(request.templateSelect().locator('option:checked')).toHaveText('Review Request');
        await expect(request.responseDueDate()).not.toHaveValue('');
        await expect(request.reviewDueDate()).not.toHaveValue('');
        await request.cancel();
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(0);
        await expect(panel.row(fullName(kay))).toBeVisible();

        // Open it again, type at the end of the "Review Request" message
        // and press the "Close" arrow: the window closes without asking
        // (the one dialog left is the workflow, its Participants heading
        // reachable again; while the window was open it was the one dialog
        // and the workflow behind it hidden: pitfall 6) and Kay stays.
        request = await panel.addReviewerFromRow(fullName(kay));
        await expect(request.selectedReviewerName()).toHaveText(fullName(kay));
        await expect(page.getByRole('dialog')).toHaveCount(1);
        await expect(workflow.participantsHeading()).toHaveCount(0);
        await request.appendToMessage('Please reply within a week.');
        await request.close();
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(0);
        await expect(page.getByRole('dialog')).toHaveCount(1);
        await expect(workflow.participantsHeading()).toBeVisible();
        await expect(panel.row(fullName(kay))).toBeVisible();

        // Open it again and press "Add Reviewer": Kay joins the Reviewers
        // panel and leaves the suggestions at once, with no reload.
        request = await panel.addReviewerFromRow(fullName(kay));
        await expect(request.selectedReviewerName()).toHaveText(fullName(kay));
        await request.submit();
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(0);
        await expect(reviewerRow(reviewers(), fullName(kay))).toBeVisible();
        await expect(panel.row(fullName(kay))).toHaveCount(0);
        await expect(panel.row(fullName(lee))).toBeVisible();
        await expect(panel.rows()).toHaveCount(2);

        // Lee (an account without the role): "Enroll an Existing User as
        // Reviewer", prefilled with him and the press's "External Reviewer".
        request = await panel.addReviewerFromRow(fullName(lee));
        await expect(request.enrollHeading()).toBeVisible();
        await expect(request.searchByName()).toHaveValue(`${fullName(lee)} (${lee.email})`);
        await expect(request.userGroupSelect().locator('option:checked')).toHaveText(REVIEWER_ROLE);
        await request.submit();
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(0);
        await expect(reviewerRow(reviewers(), fullName(lee))).toBeVisible();
        await expect(panel.row(fullName(lee))).toHaveCount(0);
        await expect(panel.row(fullName(nova))).toBeVisible();

        // Nova (no account), "Email" changed: "Create New Reviewer",
        // prefilled; with another address and a username of its own, "Add
        // Reviewer" lists Nova in the Reviewers panel while her row stays in
        // the panel with its "…" menu (the address differs: Rule 11).
        request = await panel.addReviewerFromRow(fullName(nova));
        await expect(request.createHeading()).toBeVisible();
        await expect(request.createGivenName()).toHaveValue(nova.givenName);
        await expect(request.createFamilyName()).toHaveValue(nova.familyName);
        await expect(request.createEmail()).toHaveValue(nova.email);
        await expect(request.createAffiliation()).toHaveValue(nova.affiliation);
        await request.createEmail().fill(novaOtherEmail);
        await request.username().fill(novaOtherUsername);
        await request.submit();
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(0);
        await expect(reviewerRow(reviewers(), fullName(nova))).toHaveCount(1);
        await expect(panel.heading()).toBeVisible();
        await expect(panel.rows()).toHaveCount(1);
        await expect(panel.row(fullName(nova))).toBeVisible();
        await expect(panel.moreActionsButton(fullName(nova))).toBeVisible();

        // Nova's row again: "Create New Reviewer", the four boxes filled as
        // before; an empty "Username" is refused and Nova stays; a username
        // adds her a second time and the panel leaves the External Review
        // stage.
        request = await panel.addReviewerFromRow(fullName(nova));
        await expect(request.createHeading()).toBeVisible();
        await expect(request.createGivenName()).toHaveValue(nova.givenName);
        await expect(request.createFamilyName()).toHaveValue(nova.familyName);
        await expect(request.createEmail()).toHaveValue(nova.email);
        await expect(request.createAffiliation()).toHaveValue(nova.affiliation);
        await expect(request.username()).toHaveValue('');
        await request.addReviewerButton().click();
        await expect(request.formError(REQUIRED)).toBeVisible();
        await expect(request.createHeading()).toBeVisible();
        await expect(panel.row(fullName(nova))).toBeVisible();
        await request.username().fill(novaUsername);
        await request.submit();
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(0);
        await expect(reviewerRow(reviewers(), fullName(nova))).toHaveCount(2);
        await expect(reviewerRow(reviewers(), fullName(kay))).toBeVisible();
        await expect(reviewerRow(reviewers(), fullName(lee))).toBeVisible();
        await expect(panel.heading()).toHaveCount(0);

        // Kay's mailbox holds the request; Nova's, at the suggested
        // address, the welcome and the request.
        await pkpMail.find({to: kay.email, subject: REVIEW_REQUEST_SUBJECT, contains: tag});
        await pkpMail.find({to: nova.email, subject: WELCOME_SUBJECT});
        await pkpMail.find({to: nova.email, subject: REVIEW_REQUEST_SUBJECT, contains: tag});

        // Submission stage again: still all three, no action on any row.
        await workflow.gotoEditorial(submissionId, {menuKey: 'workflow_1'});
        await workflow.expectStageHeading('Submission');
        await panel.loaded();
        await expect(panel.rows()).toHaveCount(3);
        for (const name of names) {
            await expect(panel.row(name)).toBeVisible();
            await expect(panel.row(name).getByRole('button')).toHaveCount(0);
        }
        await expect(page.getByRole('button', {name: 'Ava Author More Actions', exact: true})).toBeVisible();

        // A monograph moved on to Copyediting: the External Review stage
        // lists Kim with no "…" menu on the row (the row's text is the
        // positive control), the Submission stage with no action either.
        await workflow.gotoEditorial(copyediting.submissionId, {menuKey: roundKey(copyediting)});
        await workflow.expectStageHeading(EXTERNAL_ROUND_1);
        await panel.loaded();
        await expect(panel.heading()).toBeVisible();
        await expect(panel.rows()).toHaveCount(1);
        const kimRow = panel.row(fullName(kim));
        await expect(kimRow).toBeVisible();
        await expect(kimRow).toContainText(kim.affiliation);
        await expect(kimRow).toContainText(kim.suggestionReason);
        await expect(panel.moreActionsButton(fullName(kim))).toHaveCount(0);
        await expect(kimRow.getByRole('button')).toHaveCount(0);
        await workflow.gotoEditorial(copyediting.submissionId, {menuKey: 'workflow_1'});
        await workflow.expectStageHeading('Submission');
        await panel.loaded();
        await expect(panel.rows()).toHaveCount(1);
        await expect(panel.row(fullName(kim))).toBeVisible();
        await expect(panel.row(fullName(kim)).getByRole('button')).toHaveCount(0);
        await expect(panel.moreActionsButton(fullName(kim))).toHaveCount(0);
        await expect(page.getByRole('button', {name: 'Ava Author More Actions', exact: true})).toBeVisible();

        // Control: a monograph with no suggestion shows the panel on neither stage.
        await workflow.gotoEditorial(control.submissionId, {menuKey: 'workflow_1'});
        await workflow.expectStageHeading('Submission');
        await panel.loaded();
        await expect(workflow.participantsHeading()).toBeVisible();
        await expect(panel.heading()).toHaveCount(0);
        await workflow.gotoEditorial(control.submissionId, {menuKey: roundKey(control)});
        await workflow.expectStageHeading(EXTERNAL_ROUND_1);
        await panel.loaded();
        await expect(workflow.participantsHeading()).toBeVisible();
        await expect(panel.heading()).toHaveCount(0);
    });

    test('S3: the suggestions list inside Add Reviewer', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s3', testInfo);
        const manager = `mgr${tag}`;
        const author = `au${tag}`;
        const kayUser = `rev${tag}`;
        const patUser = `pat${tag}`;
        const kay = KAY(mailOf(kayUser));
        const pat = PAT(mailOf(patUser));
        const nova = NOVA(`nova.${tag}@mail.test`);
        const novaUsername = `nova${tag}`;
        await seedPress(ompApi, tag, [
            {username: manager, roles: ['manager'], givenName: 'Mira', familyName: 'Manager'},
            {username: author, roles: ['author'], givenName: 'Ava', familyName: 'Author'},
            {username: kayUser, roles: ['externalReviewer'], givenName: kay.givenName, familyName: kay.familyName},
            {username: patUser, roles: ['externalReviewer'], givenName: pat.givenName, familyName: pat.familyName},
        ]);
        // Kay is on the round from the start, so her suggestion stays pending.
        const seed = await seedInReview(ompApi, {
            tag,
            context: tag,
            submitter: author,
            reviewers: [{username: kayUser, status: 'invited'}],
            reviewerSuggestions: [kay, pat, nova],
        });
        const control = await seedInReview(ompApi, {tag: `${tag}c`, context: tag, submitter: author});
        const {submissionId} = seed;
        const key = roundKey(seed);

        const page = await (await asUser(manager)).newPage();
        const workflow = workflowFor(page, tag);
        const panel = new SuggestedReviewersPanel(page);
        const reviewers = () => workflow.dialog();
        await workflow.gotoEditorial(submissionId, {menuKey: key});
        await workflow.expectStageHeading(EXTERNAL_ROUND_1);

        // The list above "Locate a Reviewer": Pat and Nova selectable, Kay
        // with the assigned notice and no button.
        let modal = await openAddReviewerWindow(page, workflow);
        let list = new SuggestionList(page, modal);
        await expect(list.heading()).toBeVisible();
        const locateHeading = modal.getByRole('heading', {name: 'Locate a Reviewer', exact: true});
        await expect(locateHeading).toBeVisible();
        const listBox = await list.heading().boundingBox();
        const locateBox = await locateHeading.boundingBox();
        expect(listBox && locateBox && listBox.y < locateBox.y, 'suggestions list above Locate a Reviewer').toBe(true);
        await expect(list.entries()).toHaveCount(3);
        for (const person of [pat, nova]) {
            const entry = list.entry(fullName(person));
            await expect(entry).toContainText(person.affiliation);
            await expect(entry).toContainText(person.suggestionReason);
            await expect(list.selectButton(entry)).toBeVisible();
            await expect(list.assignedNotice(entry)).toHaveCount(0);
        }
        const kayEntry = list.entry(fullName(kay));
        await expect(list.assignedNotice(kayEntry)).toBeVisible();
        await expect(kayEntry.locator('button')).toHaveCount(0);

        // "Select Reviewer" on Pat: the same window turns into "Selected Reviewer".
        await list.select(fullName(pat));
        let request = new ReviewerRequestWindow(page);
        await request.expectOpen();
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(1);
        await expect(request.selectedReviewerLabel()).toBeVisible();
        await expect(request.selectedReviewerName()).toHaveText(fullName(pat));
        await expect(request.dialog()).toContainText(pat.email);
        await request.submit();
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(0);
        await expect(reviewerRow(reviewers(), fullName(pat))).toBeVisible();

        // Again: Pat's entry is gone. "Select Reviewer" on Nova stacks a
        // second window on "Create New Reviewer", prefilled.
        modal = await openAddReviewerWindow(page, workflow);
        list = new SuggestionList(page, modal);
        await expect(list.entry(fullName(nova))).toBeVisible();
        await expect(list.entry(fullName(pat))).toHaveCount(0);
        await list.select(fullName(nova));
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(2);
        let inner = new ReviewerRequestWindow(page);
        await inner.expectOpen();
        await expect(inner.createHeading()).toBeVisible();
        await expect(inner.createGivenName()).toHaveValue(nova.givenName);
        await expect(inner.createFamilyName()).toHaveValue(nova.familyName);
        await expect(inner.createEmail()).toHaveValue(nova.email);
        await expect(inner.createAffiliation()).toHaveValue(nova.affiliation);

        // A username typed, then the inner window's "Cancel": it closes
        // without asking (the outer window is the one dialog left, the two
        // Add Reviewer windows were the two a moment before; the workflow
        // behind them is hidden: pitfall 6), Nova's entry keeps its "Select
        // Reviewer"; reopened, "Username" is empty.
        await inner.username().fill(novaUsername);
        await expect(page.getByRole('dialog')).toHaveCount(2);
        await inner.cancel();
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(1);
        await expect(page.getByRole('dialog')).toHaveCount(1);
        await expect(list.selectButton(list.entry(fullName(nova)))).toBeVisible();
        await list.select(fullName(nova));
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(2);
        inner = new ReviewerRequestWindow(page);
        await inner.expectOpen();
        await expect(inner.createHeading()).toBeVisible();
        await expect(inner.createEmail()).toHaveValue(nova.email);
        await expect(inner.username()).toHaveValue('');
        await inner.username().fill(novaUsername);
        await inner.submit();

        // The inner window closes; Nova's entry leaves the list; she shows in
        // "Locate a Reviewer" as already assigned; the outer window stays.
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(1);
        await expect(list.entry(fullName(nova))).toHaveCount(0);
        await expect(list.entry(fullName(kay))).toBeVisible();
        await searchReviewerList(page, modal, nova.familyName);
        const located = reviewerListEntry(modal, fullName(nova));
        await expect(located).toBeVisible();
        await expect(located).toContainText(ASSIGNED_NOTICE);
        await expect(located.getByRole('button', {name: `Select ${fullName(nova)}`})).toHaveCount(0);
        await expect(modal).toBeVisible();

        // The "Close" arrow: the Reviewers panel lists Kay, Pat and Nova; the
        // External Review panel lists Kay alone, with her menu.
        const outer = new ReviewerRequestWindow(page);
        await outer.close();
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(0);
        await workflow.gotoEditorial(submissionId, {menuKey: key});
        await workflow.expectStageHeading(EXTERNAL_ROUND_1);
        await panel.loaded();
        for (const person of [kay, pat, nova]) {
            await expect(reviewerRow(reviewers(), fullName(person))).toBeVisible();
        }
        await expect(panel.heading()).toBeVisible();
        await expect(panel.rows()).toHaveCount(1);
        await expect(panel.row(fullName(kay))).toBeVisible();
        await expect(panel.moreActionsButton(fullName(kay))).toBeVisible();
        await expect(panel.row(fullName(pat))).toHaveCount(0);
        await expect(panel.row(fullName(nova))).toHaveCount(0);

        // Control: with no suggestion, Add Reviewer opens without the list.
        await workflow.gotoEditorial(control.submissionId, {menuKey: roundKey(control)});
        await workflow.expectStageHeading(EXTERNAL_ROUND_1);
        const controlModal = await openAddReviewerWindow(page, workflow);
        await expect(controlModal.getByRole('heading', {name: 'Locate a Reviewer', exact: true})).toBeVisible();
        await expect(new SuggestionList(page, controlModal).heading()).toHaveCount(0);
    });

    test('S4: the Funding Coordinator meets the error dialog', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s4', testInfo);
        const manager = `mgr${tag}`;
        const author = `au${tag}`;
        const kayUser = `rev${tag}`;
        const funding = `fc${tag}`;
        const kay = KAY(mailOf(kayUser));
        const nova = NOVA(`nova.${tag}@mail.test`);
        const novaUsername = `nova${tag}`;
        await seedPress(ompApi, tag, [
            {username: manager, roles: ['manager'], givenName: 'Mira', familyName: 'Manager'},
            {username: author, roles: ['author'], givenName: 'Ava', familyName: 'Author'},
            {username: kayUser, roles: ['externalReviewer'], givenName: kay.givenName, familyName: kay.familyName},
            {username: funding, roles: ['funding'], givenName: 'Fay', familyName: 'Funding'},
        ]);
        const seed = await seedInReview(ompApi, {
            tag,
            context: tag,
            submitter: author,
            reviewerSuggestions: [kay, nova],
            participants: [{username: funding, role: 'funding'}],
        });
        const {submissionId} = seed;
        const key = roundKey(seed);

        const page = await (await asUser(funding)).newPage();
        const workflow = workflowFor(page, tag);
        const reviewers = () => workflow.dialog();

        // External Review, then Submission, then back: the "Error" dialog
        // (A1) is dismissed when it comes, never asserted.
        await workflow.gotoEditorial(submissionId, {menuKey: key});
        await landPastErrorDialog(page, reviewerPanel(reviewers()));
        await workflow.gotoEditorial(submissionId, {menuKey: 'workflow_1'});
        await landPastErrorDialog(page, workflow.participantsHeading());
        await workflow.gotoEditorial(submissionId, {menuKey: key});
        await landPastErrorDialog(page, reviewerPanel(reviewers()));

        // The Reviewers panel's own Add Reviewer offers both suggestions.
        let modal = await openAddReviewerPastErrorDialog(page);
        let list = new SuggestionList(page, modal);
        await expect(list.heading()).toBeVisible();
        await expect(list.entries()).toHaveCount(2);
        for (const person of [kay, nova]) {
            await expect(list.selectButton(list.entry(fullName(person)))).toBeVisible();
        }

        // Kay: the same window turns into "Selected Reviewer"; "Add Reviewer" adds her.
        await list.select(fullName(kay));
        const request = new ReviewerRequestWindow(page);
        await request.expectOpen();
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(1);
        await expect(request.selectedReviewerLabel()).toBeVisible();
        await expect(request.selectedReviewerName()).toHaveText(fullName(kay));
        await request.submit();
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(0);
        await landPastErrorDialog(page, reviewerPanel(reviewers()));
        await expect(reviewerRow(reviewers(), fullName(kay))).toBeVisible();

        // Nova: the inner "Create New Reviewer" window, filled in; its "Add
        // Reviewer" is pressed and bounded by the grid's answer (A5: the
        // outcome is asserted neither way), then every window is closed.
        modal = await openAddReviewerPastErrorDialog(page);
        list = new SuggestionList(page, modal);
        await expect(list.entry(fullName(nova))).toBeVisible();
        await list.select(fullName(nova));
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(2);
        const inner = new ReviewerRequestWindow(page);
        await inner.expectOpen();
        await expect(inner.createHeading()).toBeVisible();
        await expect(inner.createEmail()).toHaveValue(nova.email);
        await inner.username().fill(novaUsername);
        await inner.submit();
        await closeWindowsPastErrorDialog(page);

        // Control: the Press Manager on the same External Review stage meets
        // no dialog; Kay has left the panel (Rule 11) and is still listed on
        // the Submission stage (Rule 8a).
        const managerPage = await (await asUser(manager)).newPage();
        const managerWorkflow = workflowFor(managerPage, tag);
        const managerPanel = new SuggestedReviewersPanel(managerPage);
        await managerWorkflow.gotoEditorial(submissionId, {menuKey: key});
        await managerWorkflow.expectStageHeading(EXTERNAL_ROUND_1);
        await managerPanel.loaded();
        await expect(reviewerRow(managerWorkflow.dialog(), fullName(kay))).toBeVisible();
        await expect(managerPage.getByRole('dialog', {name: 'Error', exact: true})).toHaveCount(0);
        await expect(managerPanel.row(fullName(kay))).toHaveCount(0);
        await managerWorkflow.gotoEditorial(submissionId, {menuKey: 'workflow_1'});
        await managerWorkflow.expectStageHeading('Submission');
        await managerPanel.loaded();
        await expect(managerPanel.heading()).toBeVisible();
        await expect(managerPanel.row(fullName(kay))).toBeVisible();
        await expect(managerPanel.row(fullName(nova))).toBeVisible();
        await expect(managerPage.getByRole('dialog', {name: 'Error', exact: true})).toHaveCount(0);
    });

    test('S5: Internal Review offers the list without the panel', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s5', testInfo);
        const manager = `mgr${tag}`;
        const author = `au${tag}`;
        const kayUser = `rev${tag}`;
        const kay = KAY(mailOf(kayUser));
        const nova = NOVA(`nova.${tag}@mail.test`);
        const novaUsername = `nova${tag}`;
        await seedPress(ompApi, tag, [
            {username: manager, roles: ['manager'], givenName: 'Mira', familyName: 'Manager'},
            {username: author, roles: ['author'], givenName: 'Ava', familyName: 'Author'},
            {username: kayUser, roles: ['externalReviewer'], givenName: kay.givenName, familyName: kay.familyName},
        ]);
        const seed = await ompApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            title: `Submission ${tag}`,
            decisions: ['sendInternalReview'],
            reviewRounds: [{stage: 'internal', reviewers: []}],
            reviewerSuggestions: [nova, kay],
        });
        const {submissionId} = seed;
        const internalKey = roundKey(seed);

        const page = await (await asUser(manager)).newPage();
        const workflow = workflowFor(page, tag);
        const panel = new SuggestedReviewersPanel(page);
        const reviewers = () => workflow.dialog();

        // Internal Review: Participants render, no "Reviewers Suggested by
        // Author" panel.
        await workflow.gotoEditorial(submissionId, {menuKey: internalKey});
        await workflow.expectStageHeading(INTERNAL_ROUND_1);
        await expect(workflow.participantsHeading()).toBeVisible();
        await expect(reviewerPanel(reviewers())).toBeVisible();
        await expect(panel.heading()).toHaveCount(0);

        // Its Add Reviewer window still lists both above "Locate a Reviewer".
        const modal = await openAddReviewerWindow(page, workflow);
        const list = new SuggestionList(page, modal);
        await expect(list.heading()).toBeVisible();
        const locateHeading = modal.getByRole('heading', {name: 'Locate a Reviewer', exact: true});
        await expect(locateHeading).toBeVisible();
        const listBox = await list.heading().boundingBox();
        const locateBox = await locateHeading.boundingBox();
        expect(listBox && locateBox && listBox.y < locateBox.y, 'suggestions list above Locate a Reviewer').toBe(true);
        await expect(list.entries()).toHaveCount(2);
        for (const person of [nova, kay]) {
            await expect(list.selectButton(list.entry(fullName(person)))).toBeVisible();
        }

        // "Select Reviewer" on Nova: a second window on "Create New Reviewer",
        // filled from the suggestion; a username adds her, the inner window
        // closes and her entry leaves the list.
        await list.select(fullName(nova));
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(2);
        const inner = new ReviewerRequestWindow(page);
        await inner.expectOpen();
        await expect(inner.createHeading()).toBeVisible();
        await expect(inner.createGivenName()).toHaveValue(nova.givenName);
        await expect(inner.createFamilyName()).toHaveValue(nova.familyName);
        await expect(inner.createEmail()).toHaveValue(nova.email);
        await expect(inner.createAffiliation()).toHaveValue(nova.affiliation);
        await inner.username().fill(novaUsername);
        await inner.submit();
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(1);
        await expect(list.entry(fullName(nova))).toHaveCount(0);
        await expect(list.entry(fullName(kay))).toBeVisible();

        // The "Close" arrow: the internal round's Reviewers panel lists Nova.
        await new ReviewerRequestWindow(page).close();
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(0);
        await expect(reviewerRow(reviewers(), fullName(nova))).toBeVisible();
        await expect(reviewerRow(reviewers(), fullName(kay))).toHaveCount(0);

        // Record "Send to External Review" and open External Review: the
        // panel lists Kay only, her row ending in the "…" menu with "Add
        // Reviewer".
        await decisionButton(reviewers(), 'Send to External Review').click();
        await page.waitForURL(/\/decision\//, {waitUntil: 'commit', timeout: 30_000});
        await walkDecisionWizard(page);
        await workflow.gotoEditorial(submissionId);
        await workflow.expectStageHeading(EXTERNAL_ROUND_1);
        await panel.loaded();
        await expect(panel.heading()).toBeVisible();
        await expect(panel.rows()).toHaveCount(1);
        await expect(panel.row(fullName(kay))).toBeVisible();
        await expect(panel.row(fullName(nova))).toHaveCount(0);
        const items = await panel.openMenu(fullName(kay));
        await expect(items).toHaveCount(1);
        await expect(items).toHaveText('Add Reviewer');
        await panel.moreActionsButton(fullName(kay)).click();
        await expect(items).toHaveCount(0);

        // The round's Reviewers panel starts empty; its Add Reviewer window
        // has Kay's entry alone under "Select a Reviewer from Reviewer
        // Suggestions".
        await expect(reviewerPanel(reviewers())).toContainText('No Items');
        await expect(reviewerRow(reviewers(), fullName(nova))).toHaveCount(0);
        await expect(reviewerRow(reviewers(), fullName(kay))).toHaveCount(0);
        const external = await openAddReviewerWindow(page, workflow);
        const externalList = new SuggestionList(page, external);
        await expect(externalList.heading()).toBeVisible();
        await expect(externalList.entries()).toHaveCount(1);
        await expect(externalList.entry(fullName(kay))).toBeVisible();
        await expect(externalList.selectButton(externalList.entry(fullName(kay)))).toBeVisible();
        await expect(externalList.entry(fullName(nova))).toHaveCount(0);
        await new ReviewerRequestWindow(page).close();
        await expect(ReviewerRequestWindow.all(page)).toHaveCount(0);

        // Control: the Submission stage's panel lists both, with no action,
        // so the missing panel is Internal Review's alone.
        await workflow.gotoEditorial(submissionId, {menuKey: 'workflow_1'});
        await workflow.expectStageHeading('Submission');
        await panel.loaded();
        await expect(panel.heading()).toBeVisible();
        await expect(panel.rows()).toHaveCount(2);
        for (const person of [nova, kay]) {
            await expect(panel.row(fullName(person))).toBeVisible();
            await expect(panel.row(fullName(person)).getByRole('button')).toHaveCount(0);
        }
        await expect(page.getByRole('button', {name: 'Ava Author More Actions', exact: true})).toBeVisible();
        await workflow.gotoEditorial(submissionId, {menuKey: internalKey});
        await workflow.expectStageHeading(INTERNAL_ROUND_1);
        await expect(workflow.participantsHeading()).toBeVisible();
        await expect(panel.heading()).toHaveCount(0);
    });
});
