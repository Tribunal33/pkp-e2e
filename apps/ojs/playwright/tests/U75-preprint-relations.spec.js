// @ts-check
/**
 * @file playwright/tests/U75-preprint-relations.spec.js
 *
 * Preprint relations — OJS suite. A journal does not install this feature
 * (the spec's title badge is {OPS}), so the journal runs the one scenario
 * written for it, S7 "No preprint relations on a journal or a press"
 * {OJS OMP}: the absence test with a positive control per assertion
 * (RUNBOOK multi-app rule 3), in the journal's own words: the Journal
 * Manager, a published article, the article page. S1–S6 are the preprint
 * server's, in its tree, and the OPS suite's S2 and S5 are this scenario's
 * cross-app controls; the controls below are taken on the journal's own
 * screens, the same way as each absence.
 * Spec: docs/specs/U75-preprint-relations.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1–A11: all on the preprint server's "Relations" control, its wizard
 *   question, its Review panel or its Crossref record, which a journal
 *   does not have.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only. Two scratch submissions of the seeded journal, each with
 * its own unique tag (M5), submitted by the seeded Author as footnote s0
 * says: a `submitted: false` draft for the wizard, and a `published: true`
 * article without `issue` (published at once) for the workflow and the
 * article page.
 *
 * Each absence is read on a settled screen and paired with a control read
 * the same way (M4, M6): the workflow's control regions once the "Status:
 * Published" line has drawn, the left region's missing "Relations" button
 * beside the right region's "Unpublish" button, both queried by role; each
 * wizard step once it is current and its own content is shown, the Review
 * step once its submission check has answered, its missing "Relation
 * status" panel beside the "For the Editors" panel, both read through the
 * same panel locator; the article page once its title heading is shown (a
 * server-rendered page, complete at that point), its empty notice area
 * beside the side column's "Published" line. Waits are web-first (A5).
 * Runs in the parallel `ojs` project: nothing here changes the journal.
 */
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {ArticleLandingPage} = require('../../../../shared/playwright/pages/ArticleLandingPages.js');
const {SubmissionWizardPage} = require('../pages/SubmissionWizardPage.js');

const JOURNAL = 'publicknowledge';

/** The preprint server's words (Fields; Rule 8), none of which a journal shows. */
const RELATION = {
    button: /^Relations/,
    question: 'Relation status',
    published: /published elsewhere/i,
    vorDoi: 'DOI of the published preprint',
};

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u75${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** No wording of the relation question anywhere on the page, and no radio for it. */
async function expectNoRelationQuestion(page) {
    await expect(page.getByText(RELATION.question)).toHaveCount(0);
    await expect(page.getByText(RELATION.published)).toHaveCount(0);
    await expect(page.getByText(RELATION.vorDoi)).toHaveCount(0);
    await expect(page.locator('input[name="relationStatus"]')).toHaveCount(0);
    await expect(page.locator('input[name="vorDoi"]')).toHaveCount(0);
}

test.describe('preprint relations', () => {
    test('S7: no preprint relations on a journal', async ({page, asUser, ojsApi, appContext}, testInfo) => {
        test.setTimeout(180_000);
        const tag = makeTag('s7', testInfo);
        const title = `Submission ${tag}`;
        const [draft, article] = await Promise.all([
            ojsApi.createSubmission({
                tag: `${tag}d`,
                context: JOURNAL,
                submitter: 'author.alex',
                title: `Draft ${tag}`,
                submitted: false,
            }),
            ojsApi.createSubmission({
                tag,
                context: JOURNAL,
                submitter: 'author.alex',
                title,
                published: true,
            }),
        ]);

        // The publication pages: the Journal Manager opens the published
        // article's workflow at "Title & Abstract"; the control region above
        // the page carries no "Relations" button (Purpose, the absence
        // paragraph). Control: the same regions, read once the "Status:
        // Published" line has drawn, offer "Unpublish", queried by role the
        // same way.
        const managerPage = await (await asUser('manager.maya')).newPage();
        const workflow = new WorkflowPage(managerPage, JOURNAL, {appContext});
        await workflow.gotoEditorial(article.submissionId);
        await workflow.selectPage('Title & Abstract');
        await workflow.expectPublicationStatus('Published');
        await expect(workflow.publishingControl('Unpublish')).toBeVisible({timeout: 30_000});
        await expect(workflow.controlsLeft().getByRole('button', {name: RELATION.button})).toHaveCount(0);
        await expect(workflow.dialog().getByRole('button', {name: RELATION.button})).toHaveCount(0);
        const leftItems = await workflow.controlsLeftItems();
        expect(leftItems.some((t) => /Relations/.test(t))).toBe(false);
        expect(leftItems.some((t) => /^Status: Published\b/.test(t))).toBe(true);

        // The wizard: the Author opens the draft's wizard and presses
        // "Continue" on each step up to "Review": no step asks "Relation
        // status" (Purpose, the absence paragraph). Each step is read once
        // it is current; the control on each is the step's own rail pill.
        const authorPage = await (await asUser('author.alex')).newPage();
        const wizard = new SubmissionWizardPage(authorPage, JOURNAL);
        await wizard.goto(draft.submissionId);
        await wizard.expectStep('Upload Files');
        await expectNoRelationQuestion(authorPage);
        for (const step of ['Details', 'Contributors', 'For the Editors']) {
            await wizard.continueTo(step);
            await expectNoRelationQuestion(authorPage);
        }
        // "For the Editors", where the preprint server asks the question
        // (its "For Readers"): the step shows its own "Comments for the
        // Editor" box, and nothing about relations.
        await expect(
            authorPage.locator('#commentsForTheEditors-commentsForTheEditors-control_ifr')
        ).toBeVisible({timeout: 30_000});
        await expectNoRelationQuestion(authorPage);

        // The Review step: once its submission check has answered, it has
        // no "Relation status" panel; control: the "For the Editors" panel,
        // read through the same locator.
        await wizard.continueToReview(draft.submissionId);
        await expect(wizard.reviewPanel('For the Editors')).toBeVisible({timeout: 30_000});
        await expect(wizard.reviewPanel('Details')).toBeVisible();
        await expect(wizard.reviewPanel(RELATION.question)).toHaveCount(0);
        await expectNoRelationQuestion(authorPage);

        // The article page: the visitor, signed out, opens the published
        // article's page: no notice says it has been published elsewhere
        // (Purpose, the absence paragraph). Control: the page shows the
        // article's title and, in its side column, the "Published" line.
        const landing = new ArticleLandingPage(page, JOURNAL, {locale: 'en'});
        await landing.goto(article.submissionId);
        await expect(landing.title()).toHaveText(title);
        await expect(landing.publishedLine()).toBeVisible();
        await expect(landing.notices()).toHaveCount(0);
        await expect(page.getByText(RELATION.published)).toHaveCount(0);
        await expect(page.getByText(RELATION.vorDoi)).toHaveCount(0);
    });
});
