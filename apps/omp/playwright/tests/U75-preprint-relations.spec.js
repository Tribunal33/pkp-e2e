// @ts-check
/**
 * @file playwright/tests/U75-preprint-relations.spec.js
 *
 * Preprint relations — OMP suite. A press does not install this feature
 * (the spec's title badge is {OPS}), so the press runs the one scenario
 * written for it, S7 "No preprint relations on a journal or a press"
 * {OJS OMP}: the absence test with a positive control per assertion
 * (RUNBOOK multi-app rule 3), in the press's own words: the Press Manager,
 * a published book, the book page. S1–S6 are the preprint server's, in its
 * tree, and the OPS suite's S2 and S5 are this scenario's cross-app
 * controls; the controls below are taken on the press's own screens, the
 * same way as each absence.
 * Spec: docs/specs/U75-preprint-relations.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1–A11: all on the preprint server's "Relations" control, its wizard
 *   question, its Review panel or its Crossref record, which a press does
 *   not have.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only. Two scratch submissions of the seeded press, each with its
 * own unique tag (M5), submitted by the seeded Author as footnote s0 says:
 * a `submitted: false` draft for the wizard, and a `published: true` book
 * for the workflow and the book page.
 *
 * Each absence is read on a settled screen and paired with a control read
 * the same way (M4, M6): the workflow's control regions once the "Status:
 * Published" line has drawn, the left region's missing "Relations" button
 * beside the right region's "Unpublish" button, both queried by role; each
 * wizard step once it is current, the Review step once its submission
 * check has answered, its missing "Relation status" panel beside the "For
 * the Editors" and "Chapters" panels, all read through the same panel
 * locator; the book page once its title heading is shown (a
 * server-rendered page, complete at that point), its empty notice area
 * beside the "Published" date block. Waits are web-first (A5). Runs in the
 * parallel `omp` project: nothing here changes the press.
 */
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const wizard = require('../pages/SubmissionWizardPages.js');

const PRESS = 'publicknowledge';
/** The seeded press is bilingual, so its public pages carry the locale. */
const PRESS_PREFIX = '/en';

/** The preprint server's words (Fields; Rule 8), none of which a press shows. */
const RELATION = {
    button: /^Relations/,
    question: 'Relation status',
    published: /published elsewhere/i,
    vorDoi: 'DOI of the published preprint',
};

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u75${scenario}omw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
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
    test('S7: no preprint relations on a press', async ({page, asUser, ompApi, appContext}, testInfo) => {
        test.setTimeout(180_000);
        const tag = makeTag('s7', testInfo);
        const title = `Submission ${tag}`;
        const [draft, book] = await Promise.all([
            ompApi.createSubmission({
                tag: `${tag}d`,
                context: PRESS,
                submitter: 'author.alex',
                title: `Draft ${tag}`,
                submitted: false,
            }),
            ompApi.createSubmission({
                tag,
                context: PRESS,
                submitter: 'author.alex',
                title,
                published: true,
            }),
        ]);

        // The publication pages: the Press Manager opens the published
        // book's workflow at "Title & Abstract"; the control region above
        // the page carries no "Relations" button (Purpose, the absence
        // paragraph). Control: the same regions, read once the "Status:
        // Published" line has drawn, offer "Unpublish", queried by role the
        // same way.
        const managerPage = await (await asUser('manager.maya')).newPage();
        const workflow = new WorkflowPage(managerPage, PRESS, {appContext});
        await workflow.gotoEditorial(book.submissionId);
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
        await authorPage.goto(wizard.wizardUrl(PRESS, draft.submissionId, {localePrefix: PRESS_PREFIX}));
        await wizard.expectWizardOpen(authorPage);
        await wizard.expectStep(authorPage, wizard.STEPS.files);
        await expectNoRelationQuestion(authorPage);
        for (const step of [wizard.STEPS.details, wizard.STEPS.contributors, wizard.STEPS.editors]) {
            await wizard.continueTo(authorPage, step);
            await expectNoRelationQuestion(authorPage);
        }
        // "For the Editors", where the preprint server asks the question
        // (its "For Readers"): the step shows its own "Comments for the
        // Editor" box, and nothing about relations.
        await expect(authorPage.locator(`#${wizard.CONTROLS.editorNote}_ifr`)).toBeVisible({timeout: 30_000});
        await expectNoRelationQuestion(authorPage);

        // The Review step: once its submission check has answered, it has
        // no "Relation status" panel; control: the "For the Editors" and
        // "Chapters" panels, read through the same locator.
        await wizard.openReview(authorPage);
        await expect(wizard.reviewPanel(authorPage, wizard.STEPS.editors)).toBeVisible({timeout: 30_000});
        await expect(wizard.reviewPanel(authorPage, 'Chapters')).toBeVisible();
        await expect(wizard.reviewPanel(authorPage, RELATION.question)).toHaveCount(0);
        await expectNoRelationQuestion(authorPage);

        // The book page: the visitor, signed out, opens the published
        // book's page: no notice says it has been published elsewhere
        // (Purpose, the absence paragraph). Control: the page shows the
        // book's title and its "Published" date block.
        await page.goto(`/index.php/${PRESS}${PRESS_PREFIX}/catalog/book/${book.submissionId}`);
        const monograph = page.locator('.obj_monograph_full');
        await expect(monograph.getByRole('heading', {name: title, level: 1})).toBeVisible({timeout: 30_000});
        await expect(monograph.locator('.item.date_published')).toContainText('Published');
        await expect(monograph.locator('.cmp_notification')).toHaveCount(0);
        await expect(page.getByText(RELATION.published)).toHaveCount(0);
        await expect(page.getByText(RELATION.vorDoi)).toHaveCount(0);
    });
});
