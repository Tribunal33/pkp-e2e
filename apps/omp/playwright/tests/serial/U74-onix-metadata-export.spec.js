// @ts-check
/**
 * @file playwright/tests/serial/U74-onix-metadata-export.spec.js
 *
 * U74 — ONIX metadata & export, OMP suite, serial half: S1, whose mailbox
 * is read after the job queue has run (footnote s). A mail the page queued
 * as a job would reach the mail catcher only through a drain, and a drain
 * empties the SHARED queue, so it belongs to the serial project alone
 * (patterns.md, parallel lesson 7). S2–S9 are in
 * `tests/U74-onix-metadata-export.spec.js`, whose header lists what the
 * suite deliberately leaves out.
 * Spec: docs/specs/U74-onix-metadata-export.md
 *
 * Seeding: scenario endpoints only. S1 reads a mailbox, and the only
 * scoping the mail catcher has is a recipient unique to the test (A8), so
 * it runs on a scratch press with a throwaway Press manager ("Mona
 * Manager") and a throwaway Author ("Ava Author", the book's submitter),
 * the given's roles unchanged. The silence is bounded by a discussion
 * message the test itself sends after the drain, counted against the
 * Author's mail as the drain before the first press left it; the Activity
 * Log is compared with its rows before the first press.
 */
const {test, expect} = require('../../support/fixtures.js');
const {watchDialogs} = require('../../pages/PublicationFormatPages.js');
const {AUDIENCE, AudiencePage, RepresentativesPage} = require('../../pages/OnixPages.js');
const {runJobs} = require('../../../../../shared/playwright/support/jobs.js');

/** Unique per-run tag: one alphanumeric token, scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u74${scenario}ompw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Add a discussion on the open workflow's stage with one participant
 * ticked; the participant gets the "new discussion" email, the mailbox
 * read's positive control (A8). U73's shape.
 */
async function addDiscussion(page, {name, participantUsername, message}) {
    const panel = page.locator('[data-cy="discussion-manager"]').first();
    await expect(panel.getByRole('heading', {name: /Tasks & Discussions$/})).toBeVisible({timeout: 30_000});
    await panel.getByRole('button', {name: 'Add', exact: true}).click();
    const modal = page.locator('[data-cy="active-modal"]').filter({has: page.locator('input[name="title"]')});
    await modal.locator('input[name="title"]').fill(name);
    const participantBox = modal.getByRole('checkbox', {name: new RegExp(participantUsername)});
    await expect(participantBox).toBeVisible({timeout: 30_000});
    await participantBox.check();
    const body = modal.frameLocator('iframe').first().locator('body');
    await body.click();
    await body.fill(message);
    const saved = page.waitForResponse(
        (r) => r.request().method() === 'POST' && /\/submissions\/\d+\/tasks$/.test(r.url()),
        {timeout: 30_000}
    );
    await modal.getByRole('button', {name: 'Save', exact: true}).click();
    const response = await saved;
    expect(response.ok(), `discussion save answered ${response.status()}`).toBe(true);
    await expect(modal).toHaveCount(0, {timeout: 30_000});
}

/** The Activity Log's rows, read once its log has drawn a data row. */
async function activityLogRows(frame) {
    const dialog = await frame.openActivityLog();
    const rows = dialog.getByRole('row');
    await expect.poll(() => rows.count(), {timeout: 30_000}).toBeGreaterThan(1);
    const texts = (await rows.allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim());
    await frame.closeActivityLog();
    return texts;
}

/** The labels of the "Marketing" group's pages, in menu order. */
async function marketingPages(frame) {
    const entries = await frame.menuEntries();
    const start = entries.findIndex((e) => e.level === 1 && e.label === 'Marketing');
    const out = [];
    for (const e of start < 0 ? [] : entries.slice(start + 1)) {
        if (e.level === 1) break;
        out.push(e.label);
    }
    return out;
}

test.describe('ONIX metadata & export (U74), serial', () => {
    test.beforeEach(async ({}, testInfo) => testInfo.setTimeout(300_000));

    test("S1: A book's audience", async ({asUser, ompApi, appContext, pkpMail}, testInfo) => {
        const tag = makeTag('s1', testInfo);
        const mg = {username: `${tag}mg`, givenName: 'Mona', familyName: 'Manager', email: `${tag}mg@mail.test`, roles: ['manager']};
        const au = {username: `${tag}au`, givenName: 'Ava', familyName: 'Author', email: `${tag}au@mail.test`, roles: ['author']};
        await ompApi.createContext({tag, context: {name: `Press ${tag}`}, users: [mg, au]});
        // Given: the Author's book in Production, its audience never saved (footnote s).
        const book = await ompApi.createSubmission({
            tag: `${tag}b`,
            context: tag,
            submitter: au.username,
            title: `Book ${tag}`,
            submitted: true,
            decisions: ['skipExternalReview', 'sendToProduction'],
        });
        // The Author's mail as the seed leaves it, once its queued jobs have run.
        runJobs();
        const mailBefore = await pkpMail.count({to: au.email});

        const page = await (await asUser(mg.username)).newPage();
        const {seen} = watchDialogs(page);
        const audience = new AudiencePage(page, tag, {appContext});
        await audience.frame.gotoEditorial(book.submissionId);
        const logBefore = await activityLogRows(audience.frame);

        // The empty page (Rule 1; Fields, the "Audience" page).
        expect(await marketingPages(audience.frame)).toEqual(expect.arrayContaining(['Audience', 'Representatives', 'Publication Dates']));
        await audience.openFromMenu();
        await expect(audience.labels()).toHaveText(Object.values(AUDIENCE));
        for (const name of Object.keys(AUDIENCE)) {
            await audience.expectChosen(name, '');
        }
        await expect(audience.saveButton()).toBeVisible();

        // Saved (Rules 2, 3).
        const chosen = {
            audience: 'Professional and scholarly (06)',
            audienceRangeQualifier: 'US school grade range (11)',
            audienceRangeFrom: 'Kindergarten (K)',
            audienceRangeTo: 'Twelfth Grade (12)',
            audienceRangeExact: 'Preschool (P)',
        };
        for (const [name, option] of Object.entries(chosen)) {
            await audience.choose(name, option);
        }
        await audience.save();
        await audience.reload();
        for (const [name, option] of Object.entries(chosen)) {
            await audience.expectChosen(name, option);
        }

        // An unsaved choice dropped (Rule 2): nothing asks.
        await audience.choose('audience', 'Children (02)');
        const asked = seen.length;
        const rp = new RepresentativesPage(page, tag, {appContext});
        await rp.openFromMenu();
        expect(seen.slice(asked), 'leaving asks nothing').toEqual([]);
        await audience.openFromMenu();
        await audience.expectChosen('audience', 'Professional and scholarly (06)');

        // Control: no Activity Log line, and once the queued jobs have
        // run, the Author's mail holds the control discussion alone beside
        // what the seed left (Side effects, "No email, no Activity Log line").
        await audience.frame.gotoEditorial(book.submissionId);
        expect(await activityLogRows(audience.frame)).toEqual(logBefore);
        runJobs();
        const discussion = `Control ${tag}`;
        await addDiscussion(page, {name: discussion, participantUsername: au.username, message: `Control message ${tag}.`});
        await pkpMail.find({to: au.email, subject: discussion});
        expect(await pkpMail.count({to: au.email}), 'the Author got the control discussion and nothing else').toBe(mailBefore + 1);
    });
});
