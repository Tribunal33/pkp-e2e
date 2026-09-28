// @ts-check
/**
 * @file playwright/tests/U72-chapters-work-type.spec.js
 *
 * Chapters & work type — OJS suite. A journal does not install chapters or
 * a work type (the spec's title badge is {OMP}), so the journal runs the
 * one scenario written for it, S11 "No chapters on a journal or a preprint
 * server" {OJS OPS}: the absence test with a positive control per
 * assertion (RUNBOOK multi-app rule 3), in the journal's own words: the
 * Author's start screen, the Author's draft article on its Details step,
 * the Journal Manager's submitted article. S1–S10 are the press's, in its
 * tree; S11's preprint-server half is the OPS suite's.
 * Spec: docs/specs/U72-chapters-work-type.md
 *
 * The spec's control is taken on the seeded press, which the OJS fleet does
 * not serve (a CI job installs one app); that half ("Submission Type" on
 * the start screen, the draft book's "Chapters" section, the version's
 * "Chapters", the header's "Monograph" and the side menu's "Marketing") is
 * left to the press's tree. Here each absence is paired with what the
 * journal offers in the same place, read the same way: the start form's
 * "Section" group, the Details step's "Submission Details" section, the
 * version's "Contributors" page (beside which the press lists
 * "Chapters"), the header's "Activity Log" and "Library", and the side
 * menu's "Workflow" and "Publication" groups.
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1–A9: all on the press's chapter list, chapter window, work-type
 *   control or "Publication Dates" page, which a journal does not have.
 *
 * Seeding: two scratch submissions of `author.alex` on the seeded journal
 * in section `ART`, each with a unique tag (M5): a draft (`submitted:
 * false`), which opens the wizard on "Upload Files", and a submitted one
 * with no decision (footnote s). The seeded journal publicknowledge and the
 * seeded roster are otherwise read-only; opening the start screen creates
 * nothing on a journal (seed-facts: only a preprint server enrols on it).
 *
 * The start form is read once its "Section" group is on screen (the form
 * is drawn in one pass from the page's own data), its option legends as a
 * list and the missing "Submission Type" by locator, both paired with
 * "Section" read the same ways. The Details step's sections are read once
 * the step is current and its "Submission Details" section is shown (every
 * step's sections are in the page from its first draw; only the current
 * step's are visible), the missing "Chapters" paired with "Submission
 * Details" read the same way. The workflow's menu is read once it has drawn
 * its first entry (WorkflowPage.menuEntries waits for it; the menu is built
 * in one pass from the fetched submission), the header by a poll that
 * settles on the exact button list (M4, M6). Waits are web-first (A5).
 * Runs in the parallel `ojs` project: nothing here changes the journal.
 */
const {test, expect} = require('../support/fixtures.js');
const {StartSubmissionPage, SubmissionWizardPage} = require('../pages/SubmissionWizardPage.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');

const JOURNAL = 'publicknowledge';
const T = 30_000;

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u72${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** The start form's option-group legends, their "* Required" mark cut. */
async function optionLegends(start) {
    const texts = await start.page.locator('legend.pkpFormField--options__legend').allInnerTexts();
    return texts.map((t) => t.replace(/\s*\*\s*Required\s*$/, '').trim());
}

/** The current wizard step's section headings (the visible `.panelSection` h2s). */
async function stepSectionHeadings(page) {
    const texts = await page.locator('.panelSection:visible h2').allInnerTexts();
    return texts.map((t) => t.trim()).filter(Boolean);
}

test.describe('Chapters & work type', () => {
    test('S11: no chapters on a journal', async ({asUser, ojsApi, appContext}, testInfo) => {
        const tag = makeTag('s11', testInfo);
        const draft = await ojsApi.createSubmission({
            tag: `${tag}d`,
            context: JOURNAL,
            section: 'ART',
            submitter: 'author.alex',
            title: `Draft ${tag}`,
            submitted: false,
        });
        const {submissionId} = await ojsApi.createSubmission({
            tag,
            context: JOURNAL,
            section: 'ART',
            submitter: 'author.alex',
            title: `Article ${tag}`,
        });

        // The start screen: the Author's new submission asks for no
        // "Submission Type" (Purpose, the absence paragraph). Read once the
        // form's "Section" group is on screen, the legends as a list and
        // the group by locator; control: "Section", read the same two ways,
        // with its section radios.
        const authorPage = await (await asUser('author.alex')).newPage();
        const start = new StartSubmissionPage(authorPage, JOURNAL);
        await start.goto();
        await expect(start.heading()).toBeVisible({timeout: T});
        await expect(start.fieldLegend('Section')).toBeVisible({timeout: T});
        const legends = await optionLegends(start);
        expect(legends).toContain('Section');
        expect(legends).not.toContain('Submission Type');
        await expect(start.fieldLegend('Submission Type')).toHaveCount(0);
        await expect(authorPage.getByText('Submission Type', {exact: true})).toHaveCount(0);
        await expect(start.sectionRadio('Articles')).toBeVisible();
        await expect(authorPage.getByRole('radio', {name: /^Monograph\b/})).toHaveCount(0);
        await expect(authorPage.getByRole('radio', {name: /^Edited Volume\b/})).toHaveCount(0);

        // The Details step: the Author's draft, opened at its wizard
        // address, lands on "Upload Files"; Continue reaches "Details",
        // whose sections include "Submission Details" and no "Chapters"
        // (Purpose, the absence paragraph). Control: "Submission Details",
        // read the same two ways.
        const wizard = new SubmissionWizardPage(authorPage, JOURNAL);
        await wizard.goto(draft.submissionId);
        await wizard.expectStep('Upload Files');
        await wizard.continueTo('Details');
        const detailsSection = authorPage.locator('.panelSection:visible').filter({
            has: authorPage.getByRole('heading', {name: 'Submission Details', exact: true}),
        });
        await expect(detailsSection).toHaveCount(1, {timeout: T});
        const sections = await stepSectionHeadings(authorPage);
        expect(sections).toContain('Submission Details');
        expect(sections).not.toContain('Chapters');
        await expect(authorPage.getByRole('heading', {name: 'Chapters', exact: true})).toHaveCount(0);
        await expect(authorPage.getByText('Chapters', {exact: true})).toHaveCount(0);
        await expect(authorPage.getByRole('link', {name: 'Add Chapter', exact: true})).toHaveCount(0);

        // The workflow: the Journal Manager's submitted article.
        const page = await (await asUser('manager.maya')).newPage();
        const workflow = new WorkflowPage(page, JOURNAL, {appContext});
        await workflow.gotoEditorial(submissionId);
        await workflow.expectStage('Submission');

        // The header offers "Activity Log" and "Library" and no button
        // reading "Monograph" or "Edited Volume" (Purpose, the absence
        // paragraph): a poll that settles on the exact list. Control: the
        // "Library" button, read the same way by locator.
        await workflow.expectHeaderButtons(['Activity Log', 'Library']);
        await expect(workflow.headerButton('Library')).toBeVisible();
        await expect(workflow.headerButton('Activity Log')).toBeVisible();
        await expect(workflow.headerButton('Monograph')).toHaveCount(0);
        await expect(workflow.headerButton('Edited Volume')).toHaveCount(0);

        // The side menu's groups are "Workflow" and "Publication", with no
        // "Marketing" (Purpose, the absence paragraph). Read once the menu
        // has drawn, as data and by locator; control: the two groups, read
        // the same ways.
        const entries = await workflow.menuEntries();
        const groups = entries.filter((e) => e.level === 1).map((e) => e.label);
        expect(groups).toEqual(['Workflow', 'Publication']);
        expect(entries.map((e) => e.label)).not.toContain('Marketing');
        await expect(workflow.workflowGroup()).toBeVisible();
        await expect(workflow.publicationGroup()).toBeVisible();
        await expect(workflow.menuLink('Marketing')).toHaveCount(0);
        await expect(workflow.menu().getByText('Marketing', {exact: true})).toHaveCount(0);
        await expect(workflow.menuLink('Publication Dates')).toHaveCount(0);

        // "Publication" › the version lists no "Chapters" (Purpose, the
        // absence paragraph). Control: the same list holds "Contributors",
        // read the same two ways, and its page opens.
        const pages = await workflow.pagesUnderLatestVersion();
        expect(pages).toContain('Contributors');
        expect(pages).not.toContain('Chapters');
        await expect(workflow.pageLink('Contributors')).toHaveCount(1);
        await expect(workflow.pageLink('Chapters')).toHaveCount(0);
        await workflow.selectPage('Contributors');
        await workflow.expectPageHeading('Contributors');
    });
});
