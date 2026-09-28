// @ts-check
/**
 * @file playwright/tests/serial/U73-publication-formats-proof-terms.spec.js
 *
 * U73 — Publication formats & proof terms, OMP suite, serial half: S1,
 * whose mailbox is read after the job queue has run (footnote s). A mail
 * the page queued as a job would reach the mail catcher only through a
 * drain, and a drain empties the SHARED queue, so it belongs to the serial
 * project alone (patterns.md, parallel lesson 7). S2–S11 are in
 * `tests/U73-publication-formats-proof-terms.spec.js`, whose header lists
 * what the suite deliberately leaves out.
 * Spec: docs/specs/U73-publication-formats-proof-terms.md
 *
 * Seeding: scenario endpoints only. S1 reads the absence of a notice after
 * each press, and a notice is queued per user and drained by any page load
 * of that user (patterns.md, parallel lesson 2), so it runs on a scratch
 * press with a throwaway Press manager ("Mona Manager") and a throwaway
 * Author ("Ava Author", the book's submitter), the given's roles
 * unchanged; the Author's address is the test's own, which scopes the
 * mailbox read (A8). The silence is bounded twice: by the page's own
 * notice fetch after each press (its `content` empty), and in the mailbox
 * by a discussion message the test itself sends after the drain, counted
 * against the Author's mail as the drain before the first press left it.
 */
const path = require('path');
const {test, expect} = require('../../support/fixtures.js');
const {
    TEXT,
    SALES,
    DEFAULT_KIND,
    exactly,
    watchDialogs,
    expectNoNotice,
    PublicationFormatsPage,
} = require('../../pages/PublicationFormatPages.js');
const {runJobs} = require('../../../../../shared/playwright/support/jobs.js');

const ARTICLE = path.join(__dirname, '..', '..', 'fixtures', 'files', 'article.pdf');

/** Unique per-run tag: one alphanumeric token, scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u73${scenario}ompw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Add a discussion on the open workflow's stage with one participant
 * ticked; the participant gets the "new discussion" email, the mailbox
 * read's positive control (A8). U72's shape.
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

test.describe('Publication formats & proof terms (U73), serial', () => {
    test.beforeEach(async ({}, testInfo) => testInfo.setTimeout(300_000));

    test('S1: A format built and made available', async ({asUser, ompApi, appContext, pkpMail}, testInfo) => {
        const tag = makeTag('s1', testInfo);
        const mg = {username: `${tag}mg`, givenName: 'Mona', familyName: 'Manager', email: `${tag}mg@mail.test`, roles: ['manager']};
        const au = {username: `${tag}au`, givenName: 'Ava', familyName: 'Author', email: `${tag}au@mail.test`, roles: ['author']};
        await ompApi.createContext({tag, context: {name: `Press ${tag}`}, users: [mg, au]});
        // Given: the Author's book in Production, with no format (footnote s).
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
        watchDialogs(page);
        const pf = new PublicationFormatsPage(page, tag, {appContext});
        await pf.gotoEditorial(book.submissionId, book.publicationId);

        // The empty page (Fields, the page; Actors row 1).
        await expect(pf.emptyList()).toHaveText(exactly(TEXT.noItems));
        await expect(pf.addLink()).toBeVisible();
        await expect(pf.columnHeads()).toHaveText([exactly('Name'), exactly('Complete'), exactly('Availability')]);
        await expect(pf.formatBodies()).toHaveCount(0);

        // "Add publication format": the window (Fields, the format window).
        const win = await pf.openAdd();
        await expect(win.tabs()).toHaveText([exactly('Edit')]);
        await expect(win.groupHeading()).toBeVisible();
        await expect(win.nameBox()).toBeVisible();
        await expect(win.kindChosen()).toHaveText(exactly(DEFAULT_KIND));
        await expect(win.physicalBox()).not.toBeChecked();
        await expect(win.remoteBox()).not.toBeChecked();
        await expect(win.form().getByText('This format will be available at a separate website', {exact: true})).toBeVisible();
        await expect(win.urlPathBox()).toBeVisible();
        await expect(win.isbn13Box()).toBeVisible();
        await expect(win.isbn10Box()).toBeVisible();
        await expect(win.requiredNote()).toBeVisible();
        await expect(win.okButton()).toBeVisible();
        await expect(win.cancelLink()).toBeVisible();

        // An empty name: refused under the box, the window stays (Fields, "Name").
        await win.okButton().click();
        await expect(win.nameError()).toBeVisible({timeout: 30_000});
        await expect(win.dialog()).toHaveCount(1);

        // "PDF": the window closes with no notice; one format listed, and
        // nothing from the refused press (Rule 4; Fields, a format's row).
        await win.typeName('PDF');
        await expectNoNotice(page, () => win.ok());
        await expect(pf.formatBodies()).toHaveCount(1, {timeout: 30_000});
        await expect(pf.formatLabel('PDF')).toHaveText(exactly(`PDF${DEFAULT_KIND}`));
        const pdf = pf.formatRow('PDF');
        await expect(pf.rowLink(pdf, 'Awaiting Approval')).toBeVisible();
        await expect(pf.rowLink(pdf, 'Not Available')).toBeVisible();
        await expect(pf.rowLink(pdf, 'Change File')).toBeVisible();
        await expect(pf.rowLink(pdf, 'Select Files')).toBeVisible();
        await expect(pf.lineUnder('PDF')).toHaveText(exactly(TEXT.noItems));

        // A file uploaded (Rule 9): the wizard's title; the file's row; no notice.
        const wizardTitle = await expectNoNotice(page, () => pf.uploadWithChangeFile('PDF', ARTICLE));
        expect(wizardTitle).toBe(TEXT.uploadWizard);
        const file = pf.fileRow('PDF', 'article.pdf');
        expect(await pf.fileNameCell('PDF', 'article.pdf')).toMatch(/^\d+ article\.pdf$/);
        await expect(pf.rowLink(file, 'Awaiting Approval')).toBeVisible();
        await expect(pf.rowLink(file, 'Set Terms')).toBeVisible();

        // "Open Access" (Rules 15a, 15c, 15d).
        const terms = await pf.openTerms('PDF', 'article.pdf');
        await expect(terms.radio(SALES.notAvailable)).toBeChecked();
        await expect(terms.priceBox()).toBeDisabled();
        await terms.choose(SALES.openAccess);
        await expectNoNotice(page, () => terms.save());
        await expect(pf.rowLink(file, 'Open Access')).toBeVisible({timeout: 30_000});

        // The format approved (Rule 12).
        const approval = await pf.openStatus(pdf, 'Awaiting Approval', 'Format Approval');
        await expect(approval.text(TEXT.formatApprove)).toBeVisible();
        await expect(approval.cancelLink()).toBeVisible();
        await expectNoNotice(page, () => approval.ok());
        await expect(pf.rowLink(pdf, 'Approved')).toBeVisible({timeout: 30_000});

        // The file approved (Rule 13).
        const proof = await pf.openStatus(file, 'Awaiting Approval', 'Approve Proof');
        await expect(proof.text(TEXT.proofApprove)).toBeVisible();
        await expectNoNotice(page, () => proof.ok());
        await expect(pf.rowLink(file, 'Approved')).toBeVisible({timeout: 30_000});

        // Made available (Rule 14; Side effects, "Notices").
        const availability = await pf.openStatus(pdf, 'Not Available', 'Format Availability');
        await expect(availability.text(TEXT.makeAvailable)).toBeVisible();
        await expectNoNotice(page, () => availability.ok());
        await expect(pf.rowLink(pdf, 'Available')).toBeVisible({timeout: 30_000});

        // The Author's view (Rule 3; Actors row 1): the name column alone,
        // the format and its file, and no control.
        const auPage = await (await asUser(au.username)).newPage();
        watchDialogs(auPage);
        const auPf = new PublicationFormatsPage(auPage, tag, {appContext});
        await auPf.gotoAuthor(book.submissionId, book.publicationId);
        await expect(auPf.columnHeads()).toHaveText([exactly('Name')]);
        await expect(auPf.formatLabel('PDF')).toHaveText(exactly(`PDF${DEFAULT_KIND}`));
        expect(await auPf.fileNameCell('PDF', 'article.pdf')).toMatch(/^\d+ article\.pdf$/);
        await expect(auPf.addLink()).toHaveCount(0);
        await expect(auPf.grid().locator('a').filter({hasText: /^\s*(Change File|Select Files)\s*$/})).toHaveCount(0);
        await expect(auPf.statusLinks()).toHaveCount(0);
        await expect(auPf.arrows()).toHaveCount(0);
        // Its name downloads article.pdf.
        const downloaded = auPage.waitForEvent('download', {timeout: 30_000});
        const popup = auPage.waitForEvent('popup', {timeout: 5_000}).catch(() => null);
        await auPf.fileNameLink('PDF', 'article.pdf').click();
        expect((await downloaded).suggestedFilename()).toBe('article.pdf');
        const extra = await popup;
        if (extra) await extra.close().catch(() => {});

        // Control: once the queued jobs have run, the Author's mail holds
        // the control discussion alone beside what the seed left (Side
        // effects, "No email").
        runJobs();
        await pf.frame.gotoEditorial(book.submissionId);
        const discussion = `Control ${tag}`;
        await addDiscussion(page, {name: discussion, participantUsername: au.username, message: `Control message ${tag}.`});
        await pkpMail.find({to: au.email, subject: discussion});
        expect(await pkpMail.count({to: au.email}), 'the Author got the control discussion and nothing else').toBe(mailBefore + 1);
    });
});
