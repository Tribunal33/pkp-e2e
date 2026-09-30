// @ts-check
/**
 * @file playwright/tests/U04-orcid-integration.spec.js
 *
 * ORCID integration — OJS suite, one test per canonical scenario the spec
 * runs on OJS. Parallel-safe scenarios live here (S1–S3, S5–S7, S9, S10); the two
 * scenarios that assert on queued-job ORCID email (S4, S8) live in
 * tests/serial/U04-orcid-integration.spec.js — ORCID mail only reaches Mailpit
 * after an explicit queue-worker run, which must never happen while parallel
 * agents seed (patterns.md parallel lesson 7).
 * Spec: docs/specs/U04-orcid-integration.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A1 🐞,
 * A2 🐞, A4 🐞, A5 🐞, A8 🐞, A3 ❓, A6 ❓, A7 ❓, A9 ❓. Where a test passes
 * through one (S2 presses the connect button beside A4's link, S6 reads the
 * page A8 marks, S9 reads the completed review's row A1 marks) it asserts
 * the effect the spec states and leaves the finding's own claim unasserted
 * either way. The spec's Coverage section records everything else left out
 * (the OAuth legs no offline install can complete, the deposits that need
 * ORCID's service, the site-wide singleton that stays off).
 *
 * Every test seeds its own scratch journal via the scenario endpoints
 * (publicknowledge and the seeded roster stay untouched); ORCID enablement
 * and iD fixture states use the U4 scenario passthroughs (context `orcid`,
 * users[] `orcid`/`orcidIsVerified`, submission `author`).
 */
const {test, expect} = require('../support/fixtures.js');
const {
    OrcidSettingsTab,
    ProfileIdentityPage,
    contributorsPanel,
    openContributors,
    openContributorEditor,
    orcidField,
    requestVerification,
    REQUEST_QUESTION,
    REQUESTED_TEXT,
} = require('../pages/OrcidPages.js');
const {WorkflowPage, performReview} = require('../pages/ReviewStagePages.js');
const {RegisterPage, RegistrationCompletePage, siteHeader} = require('../pages/RegistrationPages.js');
const {SubmissionWizardPage} = require('../pages/SubmissionWizardPage.js');
const {MySubmissionsPage} = require('../../../../shared/playwright/pages/MySubmissionsPage.js');
const {closeMenu} = require('../../../../shared/playwright/support/menus.js');

/** A seedable test iD (ORCID's own example iD, sandbox-hosted). */
const TEST_ORCID = 'https://sandbox.orcid.org/0000-0002-1825-0097';

const UNVERIFIED_NOTE =
    'This ORCID has not been verified. Please remove this unverified ORCID and request verification from the user/author directly.';

/** Unique per-run tag: single alphanumeric token, carries app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u4${scenario}ojsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

// Re-enabled 2026-08-26 (maintainer): the dead-port proxy + sandbox-only dummy
// credentials stand — no real ORCID traffic is possible from these tests
// (see header); S2's popup asserts the sandbox URL only, without driving it,
// and its browser-side requests to ORCID are stubbed (support/orcid.js).
test.describe('ORCID integration', () => {
    test('S1: turning ORCID on adds the profile block; off removes it', {tag: '@smoke'}, async ({asUser, ojsApi}, testInfo) => {
        const tag = makeTag('s1', testInfo);
        const manager = `mgr${tag}`;
        // No orcid passthrough here — the settings tab itself is under test.
        await ojsApi.createContext({tag, users: [{username: manager, roles: ['manager']}]});

        const managerPage = await (await asUser(manager)).newPage();
        const settings = new OrcidSettingsTab(managerPage, tag);
        await settings.goto();

        // Off by default; the API/credential fields only appear once ticked.
        await expect(settings.enableCheckbox).not.toBeChecked();
        await expect(settings.apiSelect).toHaveCount(0);
        await settings.enableCheckbox.check();
        await expect(settings.apiSelect).toBeVisible();
        await settings.apiSelect.selectOption({label: 'Public Sandbox'});
        await settings.clientIdInput.fill('APP-U4S1TEST');
        await settings.clientSecretInput.fill('u4s1-dummy-secret');
        await settings.save();

        // The profile's Identity tab now offers the connect block (Rule 5).
        const profile = new ProfileIdentityPage(managerPage, tag);
        await profile.goto();
        await expect(profile.connectButton).toBeVisible();
        await expect(profile.connectButton).toContainText('Create or Connect your ORCID iD');
        await expect(profile.aboutLink).toBeVisible();

        // Untick and save (control): the tab kept the saved state, and the
        // Identity tab shows no ORCID field at all (Rule 4).
        await settings.goto();
        await expect(settings.enableCheckbox).toBeChecked();
        await settings.enableCheckbox.uncheck();
        await settings.save();

        await profile.goto();
        await expect(profile.form.locator('input[name^="givenName"]')).toBeVisible();
        await expect(profile.orcidContainer).toHaveCount(0);
    });

    test('S2: the connect button opens the ORCID sign-in popup', async ({asUser, ojsApi}, testInfo) => {
        const tag = makeTag('s2', testInfo);
        const author = `aut${tag}`;
        await ojsApi.createContext({
            tag,
            users: [{username: author, roles: ['author']}],
            orcid: {},
        });

        const userPage = await (await asUser(author)).newPage();
        const profile = new ProfileIdentityPage(userPage, tag);
        await profile.goto();

        // Pressing the button opens a small popup on an ORCID sandbox sign-in
        // address (Public Sandbox config) while the profile stays put. The
        // test never drives past its address: ORCID's site is answered
        // locally (pressConnect), so the popup does not wait on ORCID.
        const popup = await profile.pressConnect();
        await expect
            .poll(() => popup.url(), {timeout: 15_000})
            .toMatch(/sandbox\.orcid\.org\/[^?]*\?.*client_id=/);
        expect(popup.url()).toContain('authorizeOrcid');
        expect(userPage.url()).toContain('/user/profile');
        await popup.close();
        // The "What is ORCID?" link beside the button is register finding A4
        // (its click opens this same popup) — not asserted here; the page it
        // names is covered by URL in S6.
    });

    test('S3: a verified iD is removed from the profile via Delete', async ({asUser, ojsApi}, testInfo) => {
        const tag = makeTag('s3', testInfo);
        const holder = `usr${tag}`;
        const unauth = `una${tag}`;
        await ojsApi.createContext({
            tag,
            users: [
                {username: holder, roles: ['author'], orcid: TEST_ORCID, orcidIsVerified: true},
                {username: unauth, roles: ['author'], orcid: TEST_ORCID, orcidIsVerified: false},
            ],
            orcid: {},
        });

        const userPage = await (await asUser(holder)).newPage();
        const profile = new ProfileIdentityPage(userPage, tag);
        await profile.goto();

        // Verified state: the bare-iD link plus Delete; the connect button
        // and the "What is ORCID?" link beside it are gone (Rule 5). The
        // absences are read once the verified link is on screen.
        await expect(profile.orcidLink).toBeVisible();
        await expect(profile.orcidLink).toHaveAttribute('href', TEST_ORCID);
        await expect(profile.orcidLink).not.toContainText('(unauthenticated)');
        await expect(profile.deleteButton).toBeVisible();
        await expect(profile.connectButton).toHaveCount(0);
        await expect(profile.aboutLink).toHaveCount(0);
        await expect(profile.orcidContainer.getByText('What is ORCID?')).toHaveCount(0);

        // The second user's Identity tab, unauthenticated iD: the iD as a
        // hollow-icon link suffixed "(unauthenticated)" and the "Authorize
        // and Connect your ORCID iD" button (Rule 5) — the positive control
        // for the first tab's missing button and link.
        const unauthPage = await (await asUser(unauth)).newPage();
        const unauthProfile = new ProfileIdentityPage(unauthPage, tag);
        await unauthProfile.goto();
        await expect(unauthProfile.unauthenticatedLink).toBeVisible();
        await expect(unauthProfile.unauthenticatedLink).toHaveAttribute('href', TEST_ORCID);
        await expect(unauthProfile.unauthenticatedLink).toContainText('(unauthenticated)');
        await expect(unauthProfile.unauthenticatedLink.locator('svg')).toHaveCount(1);
        await expect(unauthProfile.orcidLink).toHaveCount(0);
        await expect(unauthProfile.connectButton).toBeVisible();
        await expect(unauthProfile.connectButton).toContainText('Authorize and Connect your ORCID iD');
        await expect(unauthProfile.aboutLink).toBeVisible();
        await expect(unauthProfile.deleteButton).toHaveCount(0);

        // Delete asks for confirmation; confirming removes the iD at once —
        // no separate save (Rule 6c).
        await profile.deleteButton.click();
        const dialog = userPage
            .getByRole('dialog')
            .filter({hasText: 'Are you sure you want to remove this ORCID?'});
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', {name: 'OK', exact: true}).click();

        await expect(profile.connectButton).toBeVisible();
        await expect(profile.orcidLink).toHaveCount(0);

        // Persisted: a fresh load still shows the connect state.
        await profile.goto();
        await expect(profile.connectButton).toBeVisible();
        await expect(profile.connectButton).toContainText('Create or Connect your ORCID iD');
        await expect(profile.deleteButton).toHaveCount(0);
    });

    test('S5: a contributor\'s unauthenticated iD is removed via Delete', async ({asUser, ojsApi}, testInfo) => {
        const tag = makeTag('s5', testInfo);
        const manager = `mgr${tag}`;
        const author = `aut${tag}`;
        await ojsApi.createContext({
            tag,
            users: [
                {username: manager, roles: ['manager']},
                {username: author, roles: ['author']},
            ],
            orcid: {},
        });
        const {submissionId} = await ojsApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            author: {orcid: TEST_ORCID, orcidIsVerified: false},
        });

        const managerPage = await (await asUser(manager)).newPage();
        const workflow = new WorkflowPage(managerPage, tag);
        await workflow.gotoEditorial(submissionId);
        await openContributors(managerPage);
        const modal = await openContributorEditor(managerPage, author);

        // Unauthenticated state: the suffixed iD link, the not-verified
        // warning, and Delete (Fields table; Rule 8c).
        const field = orcidField(modal);
        const idLink = field.getByRole('link', {name: new RegExp(TEST_ORCID.split('/').pop())});
        await expect(idLink).toBeVisible();
        await expect(field).toContainText('(unauthenticated)');
        await expect(field).toContainText(UNVERIFIED_NOTE);

        await field.getByRole('button', {name: 'Delete', exact: true}).click();
        const dialog = managerPage
            .getByRole('dialog')
            .filter({hasText: 'Are you sure you want to remove this ORCID?'});
        await expect(dialog).toContainText('Delete ORCID');
        const deleted = managerPage.waitForResponse(
            (response) => response.url().includes('/orcid/deleteForAuthor/') && response.ok()
        );
        await dialog.getByRole('button', {name: 'Yes', exact: true}).click();
        await deleted;

        // The field reverts to the no-iD state offering a fresh request.
        await expect(field.getByRole('button', {name: 'Request verification'})).toBeVisible();
        await expect(idLink).toHaveCount(0);
        await expect(field).not.toContainText('(unauthenticated)');
    });

    test('S6: the public ORCID pages render by URL', async ({page, ojsApi}, testInfo) => {
        const tag = makeTag('s6', testInfo);
        await ojsApi.createContext({tag, orcid: {}});

        // Signed-out visitor (the default page carries no session), addresses
        // typed directly — both render inside the journal chrome (Rule 10;
        // Rule 9's failure landing).
        await page.goto(`/index.php/${tag}/orcid/about`);
        await expect(page.getByRole('heading', {name: 'What is ORCID?'})).toBeVisible();
        await expect(page.getByText(`Scratch context ${tag}`).first()).toBeVisible();
        await expect(
            page.getByRole('heading', {name: 'How and why we collect ORCID iDs?'})
        ).toBeVisible();

        await page.goto(`/index.php/${tag}/orcid/verify`);
        await expect(page.getByRole('heading', {name: 'ORCID Authorization'})).toBeVisible();
        await expect(
            page.getByText('Your ORCID iD could not be verified. The link is no longer valid.')
        ).toBeVisible();
        await expect(
            page.getByText(
                'Please contact the journal manager with your name, ORCID iD, and details of your submission.'
            )
        ).toBeVisible();
    });

    test('S7: a journal with ORCID off shows none of it', async ({page, asUser, ojsApi}, testInfo) => {
        test.slow();
        const tagOff = makeTag('s7f', testInfo);
        const tagOn = makeTag('s7n', testInfo);
        const seedFor = (tag, orcid) =>
            ojsApi.createContext({
                tag,
                users: [
                    {username: `mgr${tag}`, roles: ['manager']},
                    {username: `aut${tag}`, roles: ['author']},
                ],
                ...(orcid ? {orcid: {}} : {}),
            });
        await seedFor(tagOff, false);
        await seedFor(tagOn, true);
        const {submissionId: subOff} = await ojsApi.createSubmission({
            tag: tagOff, context: tagOff, submitter: `aut${tagOff}`,
        });
        const {submissionId: subOn} = await ojsApi.createSubmission({
            tag: tagOn, context: tagOn, submitter: `aut${tagOn}`,
        });

        // Registration page (signed out): no ORCID block on the off journal;
        // the enabled journal shows it (positive control).
        await page.goto(`/index.php/${tagOff}/user/register`);
        await expect(page.getByRole('button', {name: 'Register', exact: true})).toBeVisible();
        await expect(page.locator('#connect-orcid-button')).toHaveCount(0);
        await page.goto(`/index.php/${tagOn}/user/register`);
        await expect(page.locator('#connect-orcid-button')).toBeVisible();

        // The site-level Register page (the site's own index/user/register,
        // present because the install hosts more than one journal): no ORCID
        // block either (Actors row 3), while the enabled journal's Register
        // page offers "Create or Connect your ORCID iD" at the top of its
        // form — the button precedes the form's first box in DOM order.
        const siteRegister = new RegisterPage(page, null);
        await siteRegister.goto();
        await siteRegister.expectForm();
        await expect(siteRegister.contextsLegend).toBeVisible();
        await expect(siteRegister.form.locator('#connect-orcid-button')).toHaveCount(0);
        await expect(page.locator('#connect-orcid-button')).toHaveCount(0);
        const onRegister = new RegisterPage(page, tagOn);
        await onRegister.goto();
        await onRegister.expectForm();
        const onConnect = onRegister.form.locator('#connect-orcid-button');
        await expect(onConnect).toBeVisible();
        await expect(onConnect).toContainText('Create or Connect your ORCID iD');
        await expect(
            onRegister.form.locator('#connect-orcid-button, input[name="givenName"]').first()
        ).toHaveAttribute('id', 'connect-orcid-button');

        // Registering without connecting: the form filled with a throwaway
        // username and address (the form's own fields are U02's), "Register"
        // pressed and the button never touched: the registration completes
        // as any registration does and the header signs the new user in
        // (Rule 7).
        const registrant = `u04s7-${tagOn}`;
        await onRegister.fillProfile();
        await onRegister.fillLogin({
            email: `${registrant}@mail.test`,
            username: registrant,
            password: `Pass${tagOn}`,
        });
        await onRegister.privacyConsent.check();
        await expect(onConnect).toBeVisible();
        await onRegister.submitButton.click();
        const complete = new RegistrationCompletePage(page);
        await complete.expectOpen();
        await expect(siteHeader(page)).toContainText(registrant);

        // Profile Identity tab: no ORCID field at all on the off journal;
        // the connect block on the enabled one (Rules 4–5).
        const offProfile = new ProfileIdentityPage(
            await (await asUser(`aut${tagOff}`)).newPage(), tagOff
        );
        await offProfile.goto();
        await expect(offProfile.form.locator('input[name^="givenName"]')).toBeVisible();
        await expect(offProfile.orcidContainer).toHaveCount(0);
        const onProfile = new ProfileIdentityPage(
            await (await asUser(`aut${tagOn}`)).newPage(), tagOn
        );
        await onProfile.goto();
        await expect(onProfile.connectButton).toBeVisible();

        // Contributor form: no ORCID iD field on the off journal; the field
        // with its request control on the enabled one (Rule 8).
        const offManagerPage = await (await asUser(`mgr${tagOff}`)).newPage();
        const offWorkflow = new WorkflowPage(offManagerPage, tagOff);
        await offWorkflow.gotoEditorial(subOff);
        await openContributors(offManagerPage);
        const offModal = await openContributorEditor(offManagerPage, `aut${tagOff}`);
        await expect(offModal.locator('#contributor-email-control')).toBeVisible();
        await expect(offModal.getByText('ORCID iD')).toHaveCount(0);

        const onManagerPage = await (await asUser(`mgr${tagOn}`)).newPage();
        const onWorkflow = new WorkflowPage(onManagerPage, tagOn);
        await onWorkflow.gotoEditorial(subOn);
        await openContributors(onManagerPage);
        const onModal = await openContributorEditor(onManagerPage, `aut${tagOn}`);
        await expect(orcidField(onModal).getByRole('button', {name: 'Request verification'})).toBeVisible();
    });

    test('S9: a completed review is sent to ORCID from the reviewer row', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s9', testInfo);
        const manager = `mgr${tag}`;
        const author = `aut${tag}`;
        const reviewerWithId = `rvo${tag}`;
        const reviewerNoId = `rvn${tag}`;
        await ojsApi.createContext({
            tag,
            users: [
                {username: manager, roles: ['manager']},
                {username: author, roles: ['author']},
                {username: reviewerWithId, roles: ['externalReviewer'], orcid: TEST_ORCID, orcidIsVerified: true},
                {username: reviewerNoId, roles: ['externalReviewer']},
            ],
            // Deposits are member-API territory (Rule 12); the sandbox keeps
            // every ORCID link on the test service.
            orcid: {apiType: 'memberSandbox'},
        });
        const {submissionId} = await ojsApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            decisions: ['sendExternalReview'],
            reviewRounds: [
                {
                    reviewers: [
                        {username: reviewerWithId, status: 'accepted'},
                        {username: reviewerNoId, status: 'accepted'},
                    ],
                },
            ],
        });

        // The verified-iD reviewer completes the review.
        const reviewerPage = await (await asUser(reviewerWithId)).newPage();
        await performReview(reviewerPage, tag, submissionId, {
            recommendation: 'Accept Submission',
        });

        const managerPage = await (await asUser(manager)).newPage();
        const workflow = new WorkflowPage(managerPage, tag);
        await workflow.gotoEditorial(submissionId);
        await workflow.expectPageTitle('Review (Round 1)');
        await expect(workflow.panelRow('Reviewers', reviewerWithId)).toContainText('Review Submitted');

        // Negative control: the no-iD reviewer's row menu has no ORCID entry.
        await workflow
            .panelRow('Reviewers', reviewerNoId)
            .getByRole('button', {name: 'More Actions'})
            .click();
        await expect(managerPage.getByRole('menuitem', {name: 'Review Details'})).toBeVisible();
        await expect(
            managerPage.getByRole('menuitem', {name: 'Send Review To ORCID'})
        ).toHaveCount(0);
        await closeMenu(managerPage);

        // The verified-iD row offers the action; confirming closes the dialog
        // with no on-screen message either way — the deposit runs in the
        // background (Rule 12).
        await workflow
            .panelRow('Reviewers', reviewerWithId)
            .getByRole('button', {name: 'More Actions'})
            .click();
        await managerPage.getByRole('menuitem', {name: 'Send Review To ORCID'}).click();
        const dialog = managerPage
            .getByRole('dialog')
            .filter({hasText: "Send this review to the reviewer's ORCID?"});
        await expect(dialog).toContainText('Send Review To ORCID');
        const sent = managerPage.waitForResponse(
            (response) => response.url().includes('/sendToOrcid') && response.ok()
        );
        await dialog.getByRole('button', {name: 'OK', exact: true}).click();
        await sent;
        await expect(dialog).toHaveCount(0);
        // Silence, bounded by the settled request: no alert, no non-empty
        // status message anywhere on the screen.
        await expect(managerPage.getByRole('alert')).toHaveCount(0);
        await expect(
            managerPage.locator('[role="status"]').filter({hasText: /\S/})
        ).toHaveCount(0);
    });

    test('S10: the Author\'s contributor list is read-only; the wizard\'s step requests', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s10', testInfo);
        const manager = `mgr${tag}`;
        const author = `aut${tag}`;
        await ojsApi.createContext({
            tag,
            users: [
                {username: manager, roles: ['manager']},
                {username: author, roles: ['author']},
            ],
            orcid: {},
        });
        const {submissionId: submitted} = await ojsApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            title: `Submitted ${tag}`,
            submitted: true,
        });
        const {submissionId: draft} = await ojsApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            title: `Draft ${tag}`,
            submitted: false,
        });

        // The submitted submission's Contributors list, opened from the
        // author's dashboard: read-only — the row is listed, nothing on it
        // opens the contributor for editing, so no ORCID iD field and no
        // "Request verification" is reached (Actors row 5). The absences are
        // read once the row itself is on screen.
        const authorPage = await (await asUser(author)).newPage();
        const authorWorkflow = new WorkflowPage(authorPage, tag);
        await authorWorkflow.gotoAuthor(submitted);
        await openContributors(authorPage, {editable: false});
        const authorPanel = contributorsPanel(authorPage);
        const authorRow = authorPanel.locator('li.listPanel__item').filter({hasText: author});
        await expect(authorRow).toBeVisible();
        await expect(authorRow.getByRole('button', {name: 'Edit', exact: true})).toHaveCount(0);
        await expect(authorPanel.getByRole('button', {name: 'Edit', exact: true})).toHaveCount(0);
        await expect(authorPage.getByRole('button', {name: 'Add Contributor'})).toHaveCount(0);
        await expect(authorPage.getByText('ORCID iD')).toHaveCount(0);
        await expect(authorPage.getByRole('button', {name: 'Request verification'})).toHaveCount(0);

        // The wizard's Contributors step: the draft, opened from the
        // dashboard's "Complete submission", opens the wizard on Upload
        // Files; Continue on to Contributors and edit the Author's own
        // contributor: the ORCID iD field shows "Request verification";
        // pressing it asks the Rule 8 question, and confirming flips the
        // field to "ORCID Verification has been requested!" (the email is
        // queued mail this parallel suite never drains — the field alone is
        // read).
        const mySubmissions = new MySubmissionsPage(authorPage, tag);
        await mySubmissions.goto();
        await mySubmissions.openView('Incomplete submissions');
        const draftRow = mySubmissions.row(`Draft ${tag}`);
        await expect(draftRow).toBeVisible({timeout: 30_000});
        await mySubmissions.completeSubmissionButton(draftRow).click();
        const wizard = new SubmissionWizardPage(authorPage, tag);
        await authorPage.waitForURL(new RegExp(`[?&]id=${draft}(&|$)`), {waitUntil: 'commit'});
        await wizard.expectLoaded();
        await wizard.expectStep('Upload Files');
        await wizard.continueTo('Details');
        await wizard.continueTo('Contributors');
        const wizardModal = await wizard.openContributorEdit(author);
        const wizardField = orcidField(wizardModal);
        await expect(wizard.contributorRequestVerificationButton(wizardModal)).toBeVisible();
        await expect(wizardField.getByRole('button', {name: 'Request verification'})).toBeVisible();
        await expect(authorPage.getByRole('dialog').filter({hasText: REQUEST_QUESTION})).toHaveCount(0);
        await requestVerification(authorPage, wizardField);
        await expect(wizardField).toContainText(REQUESTED_TEXT);
        await expect(wizardField.getByRole('button', {name: 'Request verification'})).toHaveCount(0);

        // Control: the Journal Manager, in a browser of their own, opens the
        // submitted submission's Contributors list and edits the same
        // contributor: the ORCID iD field offers "Request verification"
        // (Rule 8) — the positive control for the author's missing field.
        const managerPage = await (await asUser(manager)).newPage();
        const workflow = new WorkflowPage(managerPage, tag);
        await workflow.gotoEditorial(submitted);
        await openContributors(managerPage);
        const managerModal = await openContributorEditor(managerPage, author);
        await expect(orcidField(managerModal).getByRole('button', {name: 'Request verification'})).toBeVisible();
    });
});
