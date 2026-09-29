// @ts-check
/**
 * @file playwright/tests/U45-dois.spec.js
 *
 * DOIs — OPS suite, one test per canonical scenario the spec runs on a
 * preprint server (S1–S11 common, S12–S13 {OJS OPS}; S14–S19 are the
 * journal's and the press's), in the preprint server's own words: the
 * Preprint Server Manager, a preprint that is "Posted", the "Preprints"
 * tab with its list "Preprint DOIs", the row type "Preprint", the kinds
 * "Preprints" and "Preprint galleys, such as a published PDF", "Upon
 * reaching the production stage" (acting at the preprint's final
 * "Submit"), the versions "Author Original {n}". A preprint server has no
 * manager-level role but the Preprint Server Manager, so the Editor
 * bullets of S1 and S2 are the journal's and the press's; S3 has no
 * "Issues" box (read absent beside the "Publication Status" filters).
 * Everything runs in the parallel `ops` project: every setting is per
 * scratch server, and a preprint server's "DOI Versioning" "Yes" breaks no
 * OAI read (the OJS-only U19 A22).
 * Spec: docs/specs/U45-dois.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - OPS1 🐞: S2 reads the "DOIs" box ticked by the start of its sentence;
 *   the sentence's wording is not asserted.
 * - A3 🐞: S7's refused values are read as the notice and the box back to
 *   its old value; the missing reason is not asserted.
 * - A4 🐞: after S13's "Deposit DOIs" the item's agency panel is not read.
 * - A8 🐞: rows' tick boxes are reached by their place in the row; their
 *   missing name is not asserted.
 * - A13 🐞: S13's refused export and deposit are read as nothing
 *   downloaded / nothing marked, bounded by the action's own answer; the
 *   missing message is not asserted.
 * - A14 🐞: S9 reads the "Mark DOIs Needs Sync" question up to "…previously
 *   submitted DOIs."; its "stale" sentence is not asserted.
 * - OPS5 ❓: S4's draft is read through the "DOI Assigned" filter before
 *   its "Submit", never as listed or unlisted.
 * - OPS2 ❓, OPS3 🐞, OPS4 🐞, A2, A7, A9–A12, A15–A20: not on these
 *   scenarios' paths. OJS1–OJS3, OMP1: the journal's and the press's.
 *
 * Seeding: scenario endpoints only; publicknowledge is read, never
 * changed (S1). Every other scenario seeds its own scratch preprint server
 * with throwaway accounts (the username twice as password), as footnote sc
 * says: `doiPrefix`, `doiCreationTime`, `doiSuffixType`,
 * `enabledDoiTypes`, `doiVersioning`, `context.acronym`, the Crossref
 * plugin with `registrationAgency`; preprints through the submission
 * scenario (`published`, `galleys[]` with `preprint.pdf`, `submitted:
 * false` for S4's draft). A seeded preprint without `published` is
 * submitted and waits in Production, unposted. The DOI settings, the
 * agency choice and the plugin row are driven on screen only where the
 * scenario tests them. A DOI typed by hand carries the run's tag after the
 * spec's example value ("10.1234/e2e-a1-{tag}"): a typed DOI must be
 * unused on the whole install (Rule 9), and the fleet's database outlives
 * a run.
 *
 * Deposits are never drained (outbound HTTP is dead on the test installs:
 * a deposit stays "Submitted", "Export DOIs" answers 400), so no test reads
 * a status after a background job. Every absence is read settled (the
 * list's own fetch, the action's answer) and paired with a positive
 * control taken the same way (M4, M6); the mail catcher's silence is
 * bounded by a password-reset message sent to the server's own manager
 * after the actions (A8). Waits are web-first or bounded by the screen's
 * own answer (A5).
 */
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {ActivityLogWindow} = require('../../../../shared/playwright/pages/ActivityLogPages.js');
const {ArticleLandingPage} = require('../../../../shared/playwright/pages/ArticleLandingPages.js');
const {
    DOIS_TEXT: TEXT,
    DoiSettings,
    DoisPage,
    recordNotices,
    defaultDoiPattern,
    isListFetch,
    sideMenuEntry,
    expectSideMenu,
    openDoisFromSideMenu,
    readerDoiItem,
    readerDoiLink,
} = require('../../../../shared/playwright/pages/DoisPages.js');
const {openWorkflow, openPublicationPage, postPreprint, unpostPreprint} = require('../pages/PublicationPages.js');
const {wizardUrl, expectWizardOpen, completeAndSubmitDraft} = require('../pages/SubmissionWizardPages.js');

const SERVER = 'publicknowledge';
const PREFIX = '10.1234';
const MADE = defaultDoiPattern(PREFIX);
const STARTS_WITH_PREFIX = new RegExp(`^${PREFIX.replace('.', '\\.')}/`);
const PREPRINT = 'Preprint';
const AXOLOTL = 'Axolotl limb memory';
const TARDIGRADE = 'Tardigrade desiccation';
const CORAL = 'Coral spawning';
const MOSS = 'Moss regrowth';
const GALLEYS = 'Preprint galleys, such as a published PDF';
const KINDS = ['Preprints', GALLEYS];
const PRODUCTION = 'Upon reaching the production stage';
const PUBLICATION = 'Upon publication';
const NEVER = 'Never';
const METADATA_EVENT = 'Submission metadata updated';
const DEPOSITOR = {depositorName: 'Public Knowledge Project', depositorEmail: 'doi@mail.test'};
const PREPRINT_FILE = 'preprint.pdf';

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u45${scenario}opw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: mailOf(username), roles};
}

/**
 * Seed a scratch preprint server with a throwaway Preprint Server Manager
 * ("Mona Manager") and the Authors "Ada Lovelace" and "Mary Anning"; the
 * other keys go to the context scenario as given.
 */
async function seedServer(opsApi, tag, keys = {}) {
    const users = [
        user(`${tag}mg`, 'Mona', 'Manager', ['manager']),
        user(`${tag}al`, 'Ada', 'Lovelace', ['author']),
        user(`${tag}ma`, 'Mary', 'Anning', ['author']),
    ];
    await opsApi.createContext({tag, users, ...keys});
    return {manager: `${tag}mg`, ada: `${tag}al`, mary: `${tag}ma`};
}

/** Seed a preprint on the scratch server `tag`. */
async function seedPreprint(opsApi, tag, key, submitter, title, rest = {}) {
    return opsApi.createSubmission({tag: `${tag}${key}`, context: tag, submitter, title, ...rest});
}

/** A page as `username`, every browser dialog accepted, the notices recorded. */
async function pageAs(asUser, username) {
    const page = await (await asUser(username)).newPage();
    page.on('dialog', (dialog) => {
        dialog.accept().catch(() => {});
    });
    await recordNotices(page);
    return page;
}

/** A signed-out reader page (an explicit empty state, patterns.md lesson 8). */
async function readerPage(browser, baseURL) {
    const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
    return context.newPage();
}

/** The "https://doi.org/{doi}" address a reader page shows. */
const resolving = (doi) => `https://doi.org/${doi}`;

/** Read a DOI box's value once it holds one matching `pattern`. */
async function doiValue(box, pattern = MADE) {
    await expect(box).toHaveValue(pattern, {timeout: 30_000});
    return box.inputValue();
}

/**
 * A preprint's page signed out: its "DOI:" line reads `doi`, or (null) it
 * has none, the page's title heading being the positive control.
 */
async function expectReaderDoi(reader, tag, submissionId, doi, {version} = {}) {
    const landing = new ArticleLandingPage(reader, tag, {op: 'preprint'});
    await landing.goto(submissionId, version === undefined ? {} : {version});
    if (doi === null) {
        await expect(landing.title()).toBeVisible();
        await expect(readerDoiItem(reader)).toHaveCount(0);
        return;
    }
    await expect(readerDoiItem(reader).locator('h2.label')).toHaveText(/^\s*DOI:\s*$/);
    await expect(readerDoiLink(reader)).toHaveText(resolving(doi));
    await expect(readerDoiLink(reader)).toHaveAttribute('href', resolving(doi));
}

/** Post the version `publicationId` of a preprint (its page by address, then "Post"). */
async function postVersion(page, tag, submissionId, publicationId) {
    await openPublicationPage(page, tag, submissionId, publicationId);
    await postPreprint(page);
}

/** Post a submitted preprint from its workflow ("Post the preprint", then "Post"). */
async function postSubmitted(page, tag, submissionId) {
    await openWorkflow(page, tag, submissionId);
    await postPreprint(page);
}

/**
 * "Create New Version" on the version open, its "Revision Significance"
 * chosen by label ("Major Revision", "Minor Revision") or left as the
 * dialog offers it (null); returns the new version's publication id.
 */
async function createVersion(page, tag, significance = null) {
    // The dialog takes its stage from the loaded version at mount (U49).
    await new WorkflowPage(page, tag).expectVersionLoaded();
    await page.getByRole('link', {name: 'Create New Version', exact: true}).click();
    const dialog = page.getByRole('dialog').filter({has: page.locator('#version-versionSource-control')});
    await expect(dialog.locator('#version-versionSource-control')).toBeVisible({timeout: 30_000});
    if (significance) {
        await dialog.locator('#version-versionIsMinor-control').selectOption({label: significance});
    }
    const created = page.waitForResponse(
        (r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST' && r.ok(),
        {timeout: 30_000}
    );
    await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
    const publication = await (await created).json();
    await expect(dialog).toHaveCount(0, {timeout: 30_000});
    return publication.id;
}

/** The Activity Log's lines of `event`, read on the preprint's workflow and the window closed. */
async function activityLines(page, appContext, tag, submissionId, event = METADATA_EVENT) {
    const frame = new WorkflowPage(page, tag, {appContext, labels: {publicationGroup: 'Preprint'}});
    await frame.gotoEditorial(submissionId);
    const log = new ActivityLogWindow(page, frame);
    await log.open();
    const lines = (await log.historyLines()).filter((l) => l.event === event);
    await log.close();
    return lines;
}

/**
 * The mail catcher's silence for `recipients`, bounded by a positive
 * control: a password reset for the server's own manager, asked on the
 * server's "Forgot your password?" page after the actions (A8). The
 * manager's inbox then holds that one message and nothing else.
 */
async function expectNoMailBesidesControl(browser, baseURL, pkpMail, tag, manager, others) {
    const visitor = await readerPage(browser, baseURL);
    await visitor.goto(`/index.php/${tag}/login/lostPassword`);
    await visitor.locator('form#lostPasswordForm input#email').fill(mailOf(manager));
    await visitor.locator('form#lostPasswordForm').getByRole('button', {name: 'Reset Password'}).click();
    await pkpMail.find({to: mailOf(manager), subject: 'Password Reset Confirmation'});
    expect(await pkpMail.count({to: mailOf(manager)}), 'the manager received the control alone').toBe(1);
    for (const other of others) {
        expect(await pkpMail.count({to: mailOf(other)}), `no mail to ${other}`).toBe(0);
    }
    await visitor.context().close();
}

test.describe('DOIs', () => {
    test('S1: who opens the DOIs page, on a preprint server without a prefix', async ({browser, baseURL, asUser}) => {
        test.setTimeout(240_000);
        const manager = await pageAs(asUser, 'manager.maya');
        const dois = new DoisPage(manager, SERVER);

        // The Preprint Server Manager's DOIs page, from the side menu: headed
        // "DOIs", under the prefix warning; "Bulk Actions" offers no "Assign
        // DOIs" while it offers "Mark DOIs Registered" (Rules 2, 24).
        await manager.goto(`/index.php/${SERVER}/user/profile`);
        await expectSideMenu(manager);
        await expect(sideMenuEntry(manager, 'DOIs')).toHaveCount(1);
        await openDoisFromSideMenu(manager);
        await expect(manager).toHaveURL(new RegExp(`/index\\.php/${SERVER}(/en)?/dois`));
        await expect(dois.heading()).toBeVisible();
        await expect(dois.prefixWarning()).toHaveText(TEXT.prefixWarning, {useInnerText: true});
        await dois.expectListSettled();
        await dois.openBulkActions();
        await expect(dois.bulkItem('Mark DOIs Registered')).toBeVisible();
        await expect(dois.bulkItem('Assign DOIs')).toHaveCount(0);
        await dois.closeBulkActions();

        // "Add DOI prefix": Settings › Distribution › "DOIs" with the box and
        // "Preprints" ticked and "DOI Prefix" empty (Rule 2); left unsaved.
        const settings = new DoiSettings(manager, SERVER);
        await dois.addPrefixLink().click();
        await expect(manager).toHaveURL(/\/management\/settings\/distribution#dois/);
        await settings.openSideTab('Setup');
        await expect(settings.enableBox()).toBeChecked();
        await expect(settings.kindBox('Preprints')).toBeChecked();
        await expect(settings.prefixBox()).toHaveValue('');

        // Moderator, Author, Reader: no "DOIs" in the side menu (its other
        // entries on screen), and the address answers the access-denied
        // page (Actors row 2).
        for (const username of ['sectioneditor.ana', 'author.alex', 'reader.rosa']) {
            const page = await pageAs(asUser, username);
            await page.goto(`/index.php/${SERVER}/user/profile`);
            await expectSideMenu(page);
            await expect(sideMenuEntry(page, 'Start A New Submission'), username).toHaveCount(1);
            await expect(sideMenuEntry(page, 'DOIs'), username).toHaveCount(0);
            await new DoisPage(page, SERVER).gotoExpectingDenied(TEXT.roleDenied);
        }

        // Signed out: the Login page (Actors row 2).
        const visitor = await readerPage(browser, baseURL);
        await new DoisPage(visitor, SERVER).gotoExpectingLogin();
        await visitor.context().close();

        // Control: the Preprint Server Manager again: the page opens (Actors
        // row 2).
        await dois.goto();
        await expect(dois.heading()).toBeVisible();
        await expect(dois.listTitle()).toHaveText('Preprint DOIs');
    });

    test('S2: save a DOI prefix', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s2', testInfo);
        const {manager} = await seedServer(opsApi, tag);
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const settings = new DoiSettings(page, tag);

        // Control: before the prefix is saved, the DOIs page opens under the
        // prefix warning and "Bulk Actions" offers no "Assign DOIs" (Rule 2).
        await dois.goto();
        await expect(dois.prefixWarning()).toHaveText(TEXT.prefixWarning, {useInnerText: true});
        await dois.openBulkActions();
        await expect(dois.bulkItem('Mark DOIs Registered')).toBeVisible();
        await expect(dois.bulkItem('Assign DOIs')).toHaveCount(0);
        await dois.closeBulkActions();

        // The "Setup" tab as it arrives: the "DOIs" box ticked (its sentence
        // is OPS1's, not read), the preprint server's kinds with the first
        // ticked, no prefix, "Upon reaching the production stage" among its
        // three options, "Default", versioning "Yes" (Fields).
        await settings.goto('Setup');
        await expect(settings.enableBox()).toBeChecked();
        expect(await settings.kinds()).toEqual(KINDS.map((label, i) => ({label, checked: i === 0})));
        await expect(settings.prefixBox()).toHaveValue('');
        expect(await settings.creationTimeShown()).toBe(PRODUCTION);
        expect(await settings.creationTimeOptions()).toEqual([PRODUCTION, PUBLICATION, NEVER]);
        await expect(settings.formatRadio('Default - Automatically generates a unique eight-character suffix')).toBeChecked();
        await expect(settings.formatRadio('None')).not.toBeChecked();
        await expect(settings.versioningRadio('Yes')).toBeChecked();
        await expect(settings.versioningRadio('No')).not.toBeChecked();

        // No prefix: "Upon publication", "Save": refused under "DOI Prefix"
        // (Rule 3; A1).
        await settings.creationTimeSelect().selectOption({label: PUBLICATION});
        await settings.saveRefused(settings.setup, settings.prefixBox(), TEXT.prefixRequired);

        // A malformed prefix: "10.123", then "10.1234/" (Fields).
        await settings.prefixBox().fill('10.123');
        await settings.saveRefused(settings.setup, settings.prefixBox(), TEXT.notFormatted);
        await expect(settings.fieldError(settings.prefixBox())).not.toContainText(TEXT.prefixRequired);
        await settings.prefixBox().fill('10.1234/');
        await settings.saveRefused(settings.setup, settings.prefixBox(), TEXT.notFormatted);

        // Saved: "10.1234"; after a reload the prefix and "Upon publication"
        // are there (Fields; Rule 3).
        await settings.prefixBox().fill(PREFIX);
        await settings.save(settings.setup);
        await expect(settings.fieldError(settings.prefixBox())).toHaveCount(0);
        await settings.goto('Setup');
        await expect(settings.prefixBox()).toHaveValue(PREFIX);
        expect(await settings.creationTimeShown()).toBe(PUBLICATION);

        // The DOIs page: no prefix warning, "Assign DOIs" offered (Rules 2, 25).
        await dois.goto();
        await expect(dois.heading()).toBeVisible();
        await expect(dois.prefixWarning()).toHaveCount(0);
        await dois.openBulkActions();
        await expect(dois.bulkItem('Assign DOIs')).toBeVisible();
        await dois.closeBulkActions();
    });

    test('S3: the list: rows, search and filters', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s3', testInfo);
        const {manager, ada, mary} = await seedServer(opsApi, tag, {doiPrefix: PREFIX, doiCreationTime: 'publication'});
        const axolotl = await seedPreprint(opsApi, tag, 'ax', ada, AXOLOTL, {published: true});
        const tardigrade = await seedPreprint(opsApi, tag, 'ta', mary, TARDIGRADE);
        const coral = await seedPreprint(opsApi, tag, 'co', mary, CORAL);
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const AX = new RegExp(`— ${AXOLOTL}$`);
        const TA = new RegExp(`— ${TARDIGRADE}$`);
        const CO = new RegExp(`— ${CORAL}$`);
        const all = [AX, TA, CO];
        const expectListed = async (patterns) => {
            await expect(dois.rowLink(dois.rows())).toHaveCount(patterns.length);
            const names = await dois.rowNames();
            expect(names.length).toBe(patterns.length);
            for (const pattern of patterns) expect(names.some((n) => pattern.test(n)), String(pattern)).toBe(true);
        };

        // The page: headed "DOIs", one tab "Preprints"; the list "Preprint
        // DOIs" with "Search" and "Bulk Actions" and no "Deposit All"; the
        // "Filters" column (Fields; Rule 14).
        await page.goto(`/index.php/${tag}/user/profile`);
        await openDoisFromSideMenu(page);
        await dois.expectListSettled();
        await expect(dois.tabs()).toHaveText(['Preprints']);
        await expect(dois.tab('Issues')).toHaveCount(0);
        await expect(dois.tabHeading()).toHaveText('Preprints');
        await expect(dois.listTitle()).toHaveText('Preprint DOIs');
        await expect(dois.searchBox()).toBeVisible();
        await expect(dois.bulkActionsButton()).toBeVisible();
        await expect(dois.depositAllButton()).toHaveCount(0);
        await expect(dois.filtersHeading()).toBeVisible();

        // Which preprints are listed: all three, the posted one and the two
        // submitted and not posted (Rule 15).
        await expectListed(all);

        // A posted preprint's row (Rules 16, 17, 31).
        const axRow = dois.row(axolotl.submissionId);
        await expect(dois.rowCheckbox(axRow)).toBeVisible();
        await expect(dois.rowLink(axRow)).toHaveText(new RegExp(`^\\s*Lovelace — ${AXOLOTL}\\s*$`));
        await expect(dois.rowLink(axRow)).toHaveAttribute('target', '_blank');
        await expect(dois.rowLink(axRow)).toHaveAttribute('href', new RegExp(`/index\\.php/${tag}/preprint/view/${axolotl.submissionId}(/|$)`));
        await expect(dois.rowActions(axRow)).toContainText(String(axolotl.submissionId));
        await expect(dois.rowBadge(axRow)).toHaveText('Unregistered');
        await dois.expand(axRow, axolotl.submissionId);
        await expect(dois.versionName(axRow)).toHaveText(/^\s*Author Original 1\.0\s*$/);
        await expect(dois.columnHeaders(axRow)).toHaveText(TEXT.columns);
        expect(await dois.doiTypes(axRow)).toEqual([PREPRINT]);
        await expect(dois.doiBox(axRow, PREPRINT)).toHaveValue(STARTS_WITH_PREFIX);
        await expect(dois.doiBadge(axRow, PREPRINT)).toHaveText('Unregistered');
        await expect(dois.editButton(axRow)).toHaveText('Edit');

        // An unposted preprint's row (Rules 16, 17, 31).
        const taRow = dois.row(tardigrade.submissionId);
        await expect(dois.rowBadge(taRow)).toHaveText('Unpublished');
        await dois.expand(taRow, tardigrade.submissionId);
        await expect(dois.doiBox(taRow, PREPRINT)).toHaveValue('');
        await expect(dois.doiBadge(taRow, PREPRINT)).toHaveText('Needs DOI');
        await expect(dois.rowBadge(dois.row(coral.submissionId))).toHaveText('Unpublished');

        // Search: typing alone sends nothing and changes nothing; Enter
        // narrows; "Clear search phrase" brings the others back; "Anning"
        // finds both of her preprints (Fields, "Search"; Rule 21).
        /** @type {string[]} */
        const phrases = [];
        page.on('request', (r) => {
            const phrase = r.url().includes('/api/v1/submissions?') ? new URL(r.url()).searchParams.get('searchPhrase') : null;
            if (phrase) phrases.push(phrase);
        });
        await dois.searchBox().fill('Axolotl');
        await expectListed(all);
        await dois.search('Axolotl');
        expect(phrases, 'only the Enter sent the phrase').toEqual(['Axolotl']);
        await expectListed([AX]);
        await expect(dois.clearSearchButton()).toBeVisible();
        await dois.clearSearch();
        await expect(dois.searchBox()).toHaveValue('');
        await expectListed(all);
        await dois.search('Anning');
        await expectListed([TA, CO]);
        await dois.clearSearch();
        await expectListed(all);

        // "Status" filters (Rule 22).
        await dois.pressFilter('Needs DOI');
        await expect(dois.clearFilterButton('Needs DOI')).toBeVisible();
        await expectListed([TA, CO]);
        await dois.pressFilter('DOI Assigned');
        await expect(dois.clearFilterButton('DOI Assigned')).toBeVisible();
        await expect(dois.clearFilterButton('Needs DOI')).toHaveCount(0);
        await expectListed([AX]);
        await dois.clearFilter('DOI Assigned');
        await expect(dois.clearFilterButton('DOI Assigned')).toHaveCount(0);
        await expectListed(all);

        // "Registration" filters (Rule 22).
        await dois.pressFilter('Unregistered');
        await expect(dois.clearFilterButton('Unregistered')).toBeVisible();
        await expectListed([AX]);
        await dois.pressFilter('Unregistered');
        await expect(dois.clearFilterButton('Unregistered')).toHaveCount(0);
        await expectListed(all);

        // "Publication Status": "Unpublished" drops the posted preprint;
        // lifted, then "Posted" keeps it alone (Fields, "Filters").
        await dois.pressFilter('Unpublished');
        await expect(dois.clearFilterButton('Unpublished')).toBeVisible();
        await expectListed([TA, CO]);
        await dois.pressFilter('Unpublished');
        await expect(dois.clearFilterButton('Unpublished')).toHaveCount(0);
        await expectListed(all);
        await dois.pressFilter('Posted');
        await expect(dois.clearFilterButton('Posted')).toBeVisible();
        await expectListed([AX]);

        // No "Issues" box: the journal's alone (Fields, "Filters"), read
        // beside the column's own "Posted" filter.
        await expect(dois.filter('Posted')).toBeVisible();
        await expect(dois.issuesBox()).toHaveCount(0);
    });

    test('S4: DOIs made at the preprint\'s final "Submit"', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s4', testInfo);
        const {manager, mary} = await seedServer(opsApi, tag, {doiPrefix: PREFIX});
        const tardigrade = await seedPreprint(opsApi, tag, 'ta', mary, TARDIGRADE, {submitted: false});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const row = dois.row(tardigrade.submissionId);

        // Before the "Submit": the "DOI Assigned" filter keeps nothing, its
        // settled list showing the empty line (Rule 5; OPS5 not read).
        await dois.goto();
        await dois.pressFilter('DOI Assigned');
        await expect(dois.emptyLine()).toBeVisible();
        await expect(row).toHaveCount(0);

        // The Author finishes the draft with the wizard's final "Submit"
        // (Rule 5).
        const author = await pageAs(asUser, mary);
        await author.goto(wizardUrl(tag, tardigrade.submissionId));
        await expectWizardOpen(author);
        await completeAndSubmitDraft(author);

        // The made DOI: listed "Unpublished"; its "Preprint" row holds a
        // "Default" DOI reading "Unregistered" (Rules 5, 6a, 15, 16, 32);
        // the "DOI Assigned" filter now keeps it (the control's other end).
        await dois.goto();
        await expect(dois.rowLink(row)).toHaveText(new RegExp(`— ${TARDIGRADE}\\s*$`));
        await expect(dois.rowBadge(row)).toHaveText('Unpublished');
        await dois.expand(row, tardigrade.submissionId);
        expect(await dois.doiTypes(row)).toEqual([PREPRINT]);
        await expect(dois.doiBox(row, PREPRINT)).toHaveValue(MADE);
        await expect(dois.doiBadge(row, PREPRINT)).toHaveText('Unregistered');
        await dois.pressFilter('DOI Assigned');
        await expect(dois.rows()).toHaveCount(1);
        await expect(dois.rowLink(row)).toHaveText(new RegExp(`— ${TARDIGRADE}\\s*$`));
    });

    test('S5: DOIs made at posting, a galley\'s included', async ({browser, baseURL, asUser, opsApi, appContext}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s5', testInfo);
        const {manager, ada, mary} = await seedServer(opsApi, tag, {
            doiPrefix: PREFIX,
            doiCreationTime: 'publication',
            enabledDoiTypes: ['publication', 'representation'],
        });
        const galleys = [{label: 'PDF', file: PREPRINT_FILE}];
        const axolotl = await seedPreprint(opsApi, tag, 'ax', ada, AXOLOTL, {galleys});
        const tardigrade = await seedPreprint(opsApi, tag, 'ta', mary, TARDIGRADE, {galleys});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const axRow = dois.row(axolotl.submissionId);
        const taRow = dois.row(tardigrade.submissionId);

        // Before posting: both "Unpublished"; the "Preprint" row empty and
        // "Needs DOI" (Rules 5, 17, 31).
        await dois.goto();
        await expect(dois.rowBadge(axRow)).toHaveText('Unpublished');
        await expect(dois.rowBadge(taRow)).toHaveText('Unpublished');
        await dois.expand(axRow, axolotl.submissionId);
        await expect(dois.doiBox(axRow, PREPRINT)).toHaveValue('');
        await expect(dois.doiBadge(axRow, PREPRINT)).toHaveText('Needs DOI');

        // Posted: "Post the preprint".
        const logBefore = await activityLines(page, appContext, tag, axolotl.submissionId);
        await postSubmitted(page, tag, axolotl.submissionId);

        // The made DOIs: "Unregistered"; the "Preprint" and "PDF" rows each a
        // "Default" DOI, the two different (Rules 5, 6a, 17, 31).
        await dois.goto();
        await expect(dois.rowBadge(axRow)).toHaveText('Unregistered');
        await dois.expand(axRow, axolotl.submissionId);
        expect(await dois.doiTypes(axRow)).toEqual([PREPRINT, 'PDF']);
        const preprintDoi = await doiValue(dois.doiBox(axRow, PREPRINT));
        const galleyDoi = await doiValue(dois.doiBox(axRow, 'PDF'));
        expect(galleyDoi).not.toBe(preprintDoi);
        await expect(dois.doiBadge(axRow, PREPRINT)).toHaveText('Unregistered');
        await expect(dois.doiBadge(axRow, 'PDF')).toHaveText('Unregistered');

        // The reader's page: "DOI:" with the preprint's DOI as a link
        // (Rule 43; Actors row 4).
        const reader = await readerPage(browser, baseURL);
        await expectReaderDoi(reader, tag, axolotl.submissionId, preprintDoi);
        await reader.context().close();

        // The Activity Log: the posting added "Submission metadata updated",
        // every new line under the Preprint Server Manager who posted it
        // (Side effects).
        const logPosted = await activityLines(page, appContext, tag, axolotl.submissionId);
        const byManager = (lines) => lines.filter((l) => l.user === 'Mona Manager').length;
        const gained = logPosted.length - logBefore.length;
        expect(gained).toBeGreaterThanOrEqual(1);
        expect(byManager(logPosted) - byManager(logBefore)).toBe(gained);

        // Control: the unposted preprint still reads "Needs DOI" (Rule 5).
        await dois.goto();
        await dois.expand(taRow, tardigrade.submissionId);
        await expect(dois.doiBox(taRow, PREPRINT)).toHaveValue('');
        await expect(dois.doiBadge(taRow, PREPRINT)).toHaveText('Needs DOI');
    });

    test('S6: "Never", then "Assign DOIs"; DOIs switched off', async ({browser, baseURL, asUser, opsApi, pkpMail, appContext}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s6', testInfo);
        const {manager, ada, mary} = await seedServer(opsApi, tag, {doiPrefix: PREFIX, doiCreationTime: 'never'});
        const axolotl = await seedPreprint(opsApi, tag, 'ax', ada, AXOLOTL, {published: true});
        const tardigrade = await seedPreprint(opsApi, tag, 'ta', mary, TARDIGRADE, {published: true});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const settings = new DoiSettings(page, tag);
        const reader = await readerPage(browser, baseURL);
        const logBefore = (await activityLines(page, appContext, tag, axolotl.submissionId)).length;

        // Posted without a DOI: both "Needs DOI"; the reader's page has no
        // "DOI:" line (Rules 5, 43).
        await dois.goto();
        const axRow = dois.row(axolotl.submissionId);
        const taRow = dois.row(tardigrade.submissionId);
        await expect(dois.rowBadge(axRow)).toHaveText('Needs DOI');
        await expect(dois.rowBadge(taRow)).toHaveText('Needs DOI');
        await expectReaderDoi(reader, tag, axolotl.submissionId, null);

        // Control: "DOIs" in the side menu and the page open (Rule 1).
        await expect(sideMenuEntry(page, 'DOIs')).toHaveCount(1);

        // "Assign DOIs" on one preprint (Rules 6a, 24, 25).
        await dois.tick([axolotl.submissionId]);
        await dois.openBulkActions();
        await expect(dois.bulkDescription()).toHaveText(TEXT.takeAction(1));
        const assign = await dois.chooseBulkAction('Assign DOIs');
        await expect(assign).toContainText('1 item(s)');
        await expect(assign.getByRole('button', {name: 'Assign DOIs', exact: true})).toBeVisible();
        await expect(assign.getByRole('button', {name: 'Cancel', exact: true})).toBeVisible();
        const assigned = await dois.confirmAction(assign, 'Assign DOIs');
        expect(assigned.status()).toBe(200);
        await dois.expectNotice(TEXT.assigned);
        await expect(dois.rowCheckbox(axRow)).not.toBeChecked();
        await expect(dois.rowCheckbox(taRow)).not.toBeChecked();
        await dois.expand(axRow, axolotl.submissionId);
        const axDoi = await doiValue(dois.doiBox(axRow, PREPRINT));
        await expect(dois.doiBadge(axRow, PREPRINT)).toHaveText('Unregistered');

        // One already carrying a DOI keeps it; the other gets its own
        // (Rule 25).
        await dois.runBulk('Assign DOIs', [axolotl.submissionId, tardigrade.submissionId]);
        await dois.expand(axRow, axolotl.submissionId);
        await dois.expand(taRow, tardigrade.submissionId);
        await expect(dois.doiBox(axRow, PREPRINT)).toHaveValue(axDoi);
        const taDoi = await doiValue(dois.doiBox(taRow, PREPRINT));
        expect(taDoi).not.toBe(axDoi);

        // The Activity Log: one more "Submission metadata updated" under the
        // Preprint Server Manager's name (Side effects).
        const logAfter = await activityLines(page, appContext, tag, axolotl.submissionId);
        expect(logAfter.length).toBe(logBefore + 1);
        expect(logAfter.map((l) => l.user)).toContain('Mona Manager');

        // The reader's page shows the DOI (Rules 10, 43).
        await expectReaderDoi(reader, tag, axolotl.submissionId, axDoi);

        // DOIs switched off: no "DOIs" in the side menu, the address refused;
        // the reader's line stays (Rules 1, 43; Actors row 2).
        await settings.goto('Setup');
        await settings.enableBox().uncheck();
        await settings.save(settings.setup);
        await page.goto(`/index.php/${tag}/user/profile`);
        await expectSideMenu(page);
        await expect(sideMenuEntry(page, 'Settings')).toHaveCount(1);
        await expect(sideMenuEntry(page, 'DOIs')).toHaveCount(0);
        await dois.gotoExpectingDenied(TEXT.doisOff);
        await expectReaderDoi(reader, tag, axolotl.submissionId, axDoi);

        // Every kind unticked: the same (Rule 1; Settings bullet 2).
        await settings.goto('Setup');
        await settings.enableBox().check();
        await settings.kindBox('Preprints').uncheck();
        await settings.save(settings.setup);
        await settings.goto('Setup');
        await expect(settings.enableBox()).toBeChecked();
        await expect(settings.kindBox('Preprints')).not.toBeChecked();
        await page.goto(`/index.php/${tag}/user/profile`);
        await expectSideMenu(page);
        await expect(sideMenuEntry(page, 'Settings')).toHaveCount(1);
        await expect(sideMenuEntry(page, 'DOIs')).toHaveCount(0);
        await dois.gotoExpectingDenied(TEXT.doisOff);

        // No email about the DOIs (Side effects), bounded by the control.
        await expectNoMailBesidesControl(browser, baseURL, pkpMail, tag, manager, [ada, mary]);
        await reader.context().close();
    });

    test('S7: type, change and clear a DOI by hand', async ({browser, baseURL, asUser, opsApi, appContext}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s7', testInfo);
        const {manager, ada, mary} = await seedServer(opsApi, tag, {doiPrefix: PREFIX, doiCreationTime: 'never', doiSuffixType: 'none'});
        const axolotl = await seedPreprint(opsApi, tag, 'ax', ada, AXOLOTL, {published: true});
        const tardigrade = await seedPreprint(opsApi, tag, 'ta', mary, TARDIGRADE, {published: true});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const settings = new DoiSettings(page, tag);
        const reader = await readerPage(browser, baseURL);
        const first = `${PREFIX}/e2e-a1-${tag}`;
        const second = `${PREFIX}/e2e-a2-${tag}`;
        const logBefore = (await activityLines(page, appContext, tag, axolotl.submissionId)).length;

        // The "None" format and its "DOI management page" link (Fields; Rule 6b).
        await settings.goto('Setup');
        await expect(settings.formatRadio('None - Suffixes must be entered manually on the DOI management page and will not be generated automatically')).toBeChecked();
        await expect(settings.formatRadio('Default')).not.toBeChecked();
        const fetched = page.waitForResponse((r) => isListFetch(r), {timeout: 30_000});
        await settings.managementPageLink().click();
        await fetched;
        await expect(page).toHaveURL(new RegExp(`/index\\.php/${tag}/dois`));
        await expect(dois.heading()).toBeVisible();
        await dois.expectListSettled();

        // A typed DOI (Fields, a DOI box; Rules 18, 32).
        const axRow = dois.row(axolotl.submissionId);
        await dois.expand(axRow, axolotl.submissionId);
        await expect(dois.doiBox(axRow, PREPRINT)).toHaveJSProperty('readOnly', true);
        await dois.startEditing(axRow);
        await expect(dois.doiBox(axRow, PREPRINT)).toHaveJSProperty('readOnly', false);
        await dois.doiBox(axRow, PREPRINT).fill(first);
        await dois.saveEditing(axRow);
        await dois.expectNotice(TEXT.updated);
        await expect(dois.doiBox(axRow, PREPRINT)).toHaveValue(first);
        await expect(dois.doiBadge(axRow, PREPRINT)).toHaveText('Unregistered');

        // The other side: the reader's line; one more Activity Log line
        // (Rules 10, 43; Side effects).
        await expectReaderDoi(reader, tag, axolotl.submissionId, first);
        const logTyped = (await activityLines(page, appContext, tag, axolotl.submissionId)).length;
        expect(logTyped).toBe(logBefore + 1);

        // Refused values: each leaves the box empty again and the row "Needs
        // DOI" (Fields, a DOI box; Rules 9, 18).
        await dois.goto();
        const taRow = dois.row(tardigrade.submissionId);
        await dois.expand(taRow, tardigrade.submissionId);
        for (const value of ['abc', `${PREFIX}/a b`, first]) {
            await dois.startEditing(taRow);
            await dois.doiBox(taRow, PREPRINT).fill(value);
            const statuses = await dois.saveEditing(taRow);
            expect(statuses.every((s) => s >= 400), `${value} refused (${statuses})`).toBe(true);
            await dois.expectNotice(TEXT.partialFailure);
            await expect(dois.doiBox(taRow, PREPRINT)).toHaveValue('');
            await expect(dois.doiBadge(taRow, PREPRINT)).toHaveText('Needs DOI');
        }

        // Changed: the reader's line follows; a preprint server's Activity
        // Log gains another line (Rules 10, 18; Side effects).
        await dois.expand(axRow, axolotl.submissionId);
        await dois.startEditing(axRow);
        await dois.doiBox(axRow, PREPRINT).fill(second);
        await dois.saveEditing(axRow);
        await dois.expectNotice(TEXT.updated);
        await expect(dois.doiBox(axRow, PREPRINT)).toHaveValue(second);
        await expectReaderDoi(reader, tag, axolotl.submissionId, second);
        expect((await activityLines(page, appContext, tag, axolotl.submissionId)).length).toBe(logTyped + 1);

        // Cleared: "Needs DOI" again, no reader line (Rules 10, 18, 43).
        await dois.goto();
        await dois.expand(axRow, axolotl.submissionId);
        await dois.startEditing(axRow);
        await dois.doiBox(axRow, PREPRINT).fill('');
        await dois.saveEditing(axRow);
        await expect(dois.doiBox(axRow, PREPRINT)).toHaveValue('');
        await expect(dois.doiBadge(axRow, PREPRINT)).toHaveText('Needs DOI');
        await expectReaderDoi(reader, tag, axolotl.submissionId, null);

        // Control: "Edit", then "Save" with nothing changed closes the
        // editing and sends nothing (Rule 18).
        await dois.expand(taRow, tardigrade.submissionId);
        await dois.startEditing(taRow);
        const statuses = await dois.saveEditing(taRow, {expectRequests: false});
        expect(statuses).toEqual([]);
        await expect(dois.doiBox(taRow, PREPRINT)).toHaveJSProperty('readOnly', true);
        await reader.context().close();
    });

    test('S8: a custom suffix pattern', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s8', testInfo);
        const {manager, ada} = await seedServer(opsApi, tag, {
            context: {acronym: 'JPK'},
            doiPrefix: PREFIX,
            doiCreationTime: 'never',
        });
        const axolotl = await seedPreprint(opsApi, tag, 'ax', ada, AXOLOTL, {published: true});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const settings = new DoiSettings(page, tag);

        // Control: before "Custom pattern", no pattern group (Fields).
        await settings.goto('Setup');
        await expect(settings.formatRadio('Default')).toBeChecked();
        await expect(settings.patternGroup()).toHaveCount(0);

        // The pattern group: the preprint server's two boxes, and no "Peer
        // Review" line (Fields).
        await settings.formatRadio('Custom pattern - (not recommended)').check();
        await expect(settings.patternGroup()).toBeVisible();
        await expect(settings.patternGroup()).toContainText(TEXT.patternHelpOpening);
        await expect(settings.patternGroup().getByRole('textbox')).toHaveCount(2);
        for (const label of ['Submissions', 'Preprint Galleys']) {
            await expect(settings.patternBox(label)).toBeVisible();
        }
        await expect(settings.patternGroup()).not.toContainText(TEXT.patternNotSupported);

        // An empty box refused under "Submissions" (Fields).
        await settings.saveRefused(settings.setup, settings.patternBox('Submissions'), TEXT.patternRequired);

        // Saved (Fields).
        await settings.patternBox('Submissions').fill('%j.%a');
        await settings.save(settings.setup);

        // The made DOI: "10.1234/jpk.{its number}" (Rules 6c, 16, 25).
        await dois.goto();
        await dois.runBulk('Assign DOIs', [axolotl.submissionId]);
        await dois.expectNotice(TEXT.assigned);
        const axRow = dois.row(axolotl.submissionId);
        await expect(dois.rowActions(axRow)).toContainText(String(axolotl.submissionId));
        await dois.expand(axRow, axolotl.submissionId);
        await expect(dois.doiBox(axRow, PREPRINT)).toHaveValue(`${PREFIX}/jpk.${axolotl.submissionId}`);
    });

    test('S9: mark statuses by hand; "Needs Sync" after unposting', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s9', testInfo);
        const {manager, ada, mary} = await seedServer(opsApi, tag, {doiPrefix: PREFIX});
        const axolotl = await seedPreprint(opsApi, tag, 'ax', ada, AXOLOTL, {published: true});
        const tardigrade = await seedPreprint(opsApi, tag, 'ta', mary, TARDIGRADE);
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const axRow = dois.row(axolotl.submissionId);
        const taRow = dois.row(tardigrade.submissionId);
        const expectAxolotl = async (badge, row) => {
            await expect(dois.rowBadge(axRow)).toHaveText(badge);
            await dois.expand(axRow, axolotl.submissionId);
            await expect(dois.doiBadge(axRow, PREPRINT)).toHaveText(row);
        };

        await dois.goto();
        await expectAxolotl('Unregistered', 'Unregistered');
        await expect(dois.rowBadge(taRow)).toHaveText('Unpublished');

        // "Mark DOIs Registered" refused by the unposted preprint (Rule 26).
        const refused = await dois.runBulk('Mark DOIs Registered', [axolotl.submissionId, tardigrade.submissionId]);
        expect(refused.status()).toBe(400);
        await expect(dois.failedDialog()).toContainText(
            `Failed to mark the DOI registered for ${TARDIGRADE}. The submission must be published before the status can be updated.`
        );
        await expect(dois.failedDialog()).not.toContainText(AXOLOTL);
        await dois.closeFailedDialog();
        await expectAxolotl('Unregistered', 'Unregistered');

        // Marked registered: "Edit" greyed out (Rules 19, 26).
        await dois.runBulk('Mark DOIs Registered', [axolotl.submissionId]);
        await dois.expectNotice(TEXT.markedRegistered);
        await expectAxolotl('Registered', 'Registered');
        await expect(dois.editButton(axRow)).toBeDisabled();

        // Unposted: "Unpublished", its row "Needs Sync", "Edit" pressable
        // (Rules 16, 19, 32).
        await openPublicationPage(page, tag, axolotl.submissionId, axolotl.publicationId);
        await unpostPreprint(page);
        await dois.goto();
        await expectAxolotl('Unpublished', 'Needs Sync');
        await expect(dois.editButton(axRow)).toBeEnabled();

        // Posted again: still "Needs Sync" (Rule 32).
        await postVersion(page, tag, axolotl.submissionId, axolotl.publicationId);
        await dois.goto();
        await expectAxolotl('Needs Sync', 'Needs Sync');

        // "Mark DOIs Unregistered" (Rule 27).
        await dois.runBulk('Mark DOIs Unregistered', [axolotl.submissionId]);
        await dois.expectNotice(TEXT.markedUnregistered);
        await expectAxolotl('Unregistered', 'Unregistered');

        // "Mark DOIs Needs Sync" refused (Rule 28; A14 not asserted).
        await dois.tick([axolotl.submissionId]);
        const stale = await dois.chooseBulkAction('Mark DOIs Needs Sync');
        await expect(stale).toContainText(TEXT.markStaleQuestion(1));
        const staleRefused = await dois.confirmAction(stale, 'Mark DOIs Needs Sync');
        expect(staleRefused.status()).toBe(400);
        await expect(dois.failedDialog()).toContainText(
            `Failed to mark the DOI needs sync for ${AXOLOTL}. The DOI cannot be marked needs sync because they have not yet been registered or submitted.`
        );
        await dois.closeFailedDialog();
        await expectAxolotl('Unregistered', 'Unregistered');

        // Marked "Needs Sync" after "Mark DOIs Registered" (Rule 28).
        await dois.runBulk('Mark DOIs Registered', [axolotl.submissionId]);
        await expectAxolotl('Registered', 'Registered');
        await dois.runBulk('Mark DOIs Needs Sync', [axolotl.submissionId]);
        await dois.expectNotice(TEXT.markedStale);
        await expectAxolotl('Needs Sync', 'Needs Sync');

        // Control: the unposted preprint read "Unpublished" throughout (Rule 16).
        await expect(dois.rowBadge(taRow)).toHaveText('Unpublished');
    });

    test('S10: one DOI for every version ("DOI Versioning" "No")', async ({browser, baseURL, asUser, opsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s10', testInfo);
        const {manager, ada} = await seedServer(opsApi, tag, {doiPrefix: PREFIX, doiVersioning: false});
        const axolotl = await seedPreprint(opsApi, tag, 'ax', ada, AXOLOTL, {published: true});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const reader = await readerPage(browser, baseURL);
        const changed = `${PREFIX}/e2e-v1-${tag}`;
        const row = dois.row(axolotl.submissionId);

        await dois.goto();
        await dois.expand(row, axolotl.submissionId);
        const firstDoi = await doiValue(dois.doiBox(row, PREPRINT));

        // A new version: the expanded view still shows the posted version
        // and its DOI (Rule 17).
        await openPublicationPage(page, tag, axolotl.submissionId, axolotl.publicationId);
        const newPublicationId = await createVersion(page, tag);
        await dois.goto();
        await dois.expand(row, axolotl.submissionId);
        await expect(dois.versionName(row)).toHaveText(/^\s*Author Original 1\.0\s*$/);
        await expect(dois.doiBox(row, PREPRINT)).toHaveValue(firstDoi);
        await expect(dois.versionsBar(row)).toHaveCount(0);

        // The new version posted: the same "DOI:" line (Rules 11, 43).
        await postVersion(page, tag, axolotl.submissionId, newPublicationId);
        await expectReaderDoi(reader, tag, axolotl.submissionId, firstDoi);

        // Control: before the change, the older version's page shows the
        // first DOI (Rules 11, 43).
        await expectReaderDoi(reader, tag, axolotl.submissionId, firstDoi, {version: axolotl.publicationId});

        // Changed for every version (Rules 11, 43).
        await dois.goto();
        await dois.expand(row, axolotl.submissionId);
        await dois.startEditing(row);
        await dois.doiBox(row, PREPRINT).fill(changed);
        await dois.saveEditing(row);
        await dois.expectNotice(TEXT.updated);
        await expectReaderDoi(reader, tag, axolotl.submissionId, changed);
        await expectReaderDoi(reader, tag, axolotl.submissionId, changed, {version: axolotl.publicationId});
        await reader.context().close();
    });

    test('S11: a DOI per major version ("DOI Versioning" "Yes")', async ({browser, baseURL, asUser, opsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s11', testInfo);
        // "Yes" is a new preprint server's default; seeded explicitly all the same.
        const {manager, ada} = await seedServer(opsApi, tag, {doiPrefix: PREFIX, doiVersioning: true});
        const axolotl = await seedPreprint(opsApi, tag, 'ax', ada, AXOLOTL, {published: true});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const reader = await readerPage(browser, baseURL);
        const changed = `${PREFIX}/e2e-v2-${tag}`;
        const row = dois.row(axolotl.submissionId);

        // Control: before the major version, no "There are … versions." and
        // no "View all" (Rule 20).
        await dois.goto();
        await dois.expand(row, axolotl.submissionId);
        const doi1 = await doiValue(dois.doiBox(row, PREPRINT));
        await expect(dois.editButton(row)).toBeVisible();
        await expect(dois.versionsBar(row)).toHaveCount(0);

        // A major version: "There are 2 versions." with "View all"; the
        // window's blocks, the new one "Unpublished" without a DOI
        // (Rules 12, 20).
        await openPublicationPage(page, tag, axolotl.submissionId, axolotl.publicationId);
        const majorId = await createVersion(page, tag, 'Major Revision');
        await dois.goto();
        await dois.expand(row, axolotl.submissionId);
        await expect(dois.versionsBar(row)).toContainText(TEXT.versionsLine(2));
        await expect(dois.viewAllButton(row)).toBeVisible();
        await dois.openVersionsWindow(row);
        await expect(dois.versionHeadings()).toHaveText([
            /^\s*Author Original 1\.0 \(.+\)\s*$/,
            /^\s*Author Original 2\.0 Unpublished\s*$/,
        ]);
        await expect(dois.versionDoiBox(dois.versionBlock('Author Original 1.0'), PREPRINT)).toHaveValue(doi1);
        await expect(dois.versionDoiBox(dois.versionBlock('Author Original 2.0'), PREPRINT)).toHaveValue('');
        await dois.closeVersionsWindow();

        // The major version posted: a DOI of its own; its page shows it,
        // 1.0's page keeps 1.0's (Rules 12, 43).
        await postVersion(page, tag, axolotl.submissionId, majorId);
        await dois.goto();
        await dois.expand(row, axolotl.submissionId);
        await dois.openVersionsWindow(row);
        const block2 = dois.versionBlock('Author Original 2.0');
        const doi2 = await doiValue(dois.versionDoiBox(block2, PREPRINT));
        expect(doi2).not.toBe(doi1);
        await dois.closeVersionsWindow();
        await expectReaderDoi(reader, tag, axolotl.submissionId, doi2);
        await expectReaderDoi(reader, tag, axolotl.submissionId, doi1, {version: axolotl.publicationId});

        // A minor version: still "There are 2 versions."; the window holds
        // 1.0's block and 2.1's, "Unpublished", with 2.0's DOI (Rules 12, 20).
        await openPublicationPage(page, tag, axolotl.submissionId, majorId);
        await createVersion(page, tag, 'Minor Revision');
        await dois.goto();
        await dois.expand(row, axolotl.submissionId);
        await expect(dois.versionsBar(row)).toContainText(TEXT.versionsLine(2));
        await dois.openVersionsWindow(row);
        await expect(dois.versionHeadings()).toHaveText([
            /^\s*Author Original 1\.0 \(.+\)\s*$/,
            /^\s*Author Original 2\.1 Unpublished\s*$/,
        ]);
        const block21 = dois.versionBlock('Author Original 2.1');
        await expect(dois.versionDoiBox(block21, PREPRINT)).toHaveValue(doi2);

        // One "Edit" for the window: 2.1's DOI changed; 2.0's page shows it,
        // 1.0's keeps its own (Rules 12, 20, 43).
        await expect(dois.versionsEditButton()).toHaveText(/^\s*Edit\s*$/);
        await dois.versionsEditButton().click();
        await expect(dois.versionsEditButton()).toHaveText(/^\s*Save\s*$/);
        await dois.versionDoiBox(block21, PREPRINT).fill(changed);
        const saved = page.waitForResponse((r) => /\/api\/v1\/dois\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 30_000});
        await dois.versionsEditButton().click();
        expect((await saved).status()).toBe(200);
        await dois.expectNotice(TEXT.updated);
        await expectReaderDoi(reader, tag, axolotl.submissionId, changed, {version: majorId});
        await expectReaderDoi(reader, tag, axolotl.submissionId, doi1, {version: axolotl.publicationId});
        await reader.context().close();
    });

    test('S12: choose a registration agency', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s12', testInfo);
        const {manager, ada} = await seedServer(opsApi, tag, {
            doiPrefix: PREFIX,
            enabledDoiTypes: ['publication', 'representation'],
        });
        const axolotl = await seedPreprint(opsApi, tag, 'ax', ada, AXOLOTL, {published: true, galleys: [{label: 'PDF', file: PREPRINT_FILE}]});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const settings = new DoiSettings(page, tag);
        const row = dois.row(axolotl.submissionId);

        // Control: before Crossref is saved, the "Setup" tab lists the galley
        // box ticked and the expanded view has the "PDF" row (Rules 4, 35).
        await settings.goto('Setup');
        expect(await settings.kinds()).toEqual(KINDS.map((label) => ({label, checked: true})));
        await dois.goto();
        await expect(dois.depositAllButton()).toHaveCount(0);
        await dois.expand(row, axolotl.submissionId);
        expect(await dois.doiTypes(row)).toEqual([PREPRINT, 'PDF']);
        await expect(dois.doiBox(row, 'PDF')).toHaveValue(MADE);

        // No agency plugin: the text and "Save" alone; "Saved" (Fields;
        // Settings bullet 11).
        await settings.goto('Registration');
        await expect(settings.registration).toContainText(TEXT.noAgency);
        await expect(settings.registration).toContainText(TEXT.noAgencyHelp);
        await expect(settings.agencySelect()).toHaveCount(0);
        await expect(settings.registration.locator('input:visible, select:visible, textarea:visible')).toHaveCount(0);
        await expect(settings.registration.getByRole('button')).toHaveText(['Save']);
        await settings.save(settings.registration);

        // The plugin enabled: "Registration Agency" with an empty box,
        // offering "None" and "Crossref" (Fields; Rule 34).
        await settings.gotoPlugins('crossrefplugin');
        await settings.setPluginEnabled('crossrefplugin', true);
        await settings.goto('Registration');
        const offered = await settings.agencyState();
        expect(offered.value).toBe('');
        expect(offered.options.filter(Boolean)).toEqual(['None', 'Crossref']);
        await expect(settings.registrationText(TEXT.noAgency)).toHaveCount(0);

        // Crossref chosen: its block at once; typed and saved (Fields; Rule 35).
        await expect(settings.field('depositorName')).toHaveCount(0);
        await settings.chooseAgency('Crossref');
        await expect(settings.registrationText('Crossref Settings')).toBeVisible();
        await expect(settings.field('depositorName')).toBeVisible();
        await expect(settings.field('depositorEmail')).toBeVisible();
        await expect(settings.automaticDepositBox()).not.toBeChecked();
        await settings.field('depositorName').fill(DEPOSITOR.depositorName);
        await settings.field('depositorEmail').fill(DEPOSITOR.depositorEmail);
        await settings.save(settings.registration);

        // The "Setup" tab: "Preprints" alone, ticked; the galley box gone
        // (Rule 35; A6).
        await settings.goto('Setup');
        expect(await settings.kinds()).toEqual([{label: 'Preprints', checked: true}]);
        await expect(settings.kindBox(GALLEYS)).toHaveCount(0);

        // The DOIs page: no "PDF" row; "Deposit All" (Rules 4, 36).
        await dois.goto();
        await expect(dois.depositAllButton()).toBeVisible();
        await dois.expand(row, axolotl.submissionId);
        expect(await dois.doiTypes(row)).toEqual([PREPRINT]);

        // The plugin disabled: "No Registration Agency Enabled"; no "Deposit
        // All" (Rules 34, 36).
        await settings.gotoPlugins('crossrefplugin');
        await settings.setPluginEnabled('crossrefplugin', false);
        await settings.goto('Registration');
        await expect(settings.registration).toContainText(TEXT.noAgency);
        await expect(settings.agencySelect()).toHaveCount(0);
        await dois.goto();
        await expect(dois.bulkActionsButton()).toBeVisible();
        await expect(dois.depositAllButton()).toHaveCount(0);

        // The plugin enabled again: an empty box; Crossref chosen, its saved
        // fields back; the "Setup" tab lists every kind again, the galley
        // box unticked (Rule 34).
        await settings.gotoPlugins('crossrefplugin');
        await settings.setPluginEnabled('crossrefplugin', true);
        await settings.goto('Registration');
        expect((await settings.agencyState()).value).toBe('');
        await settings.chooseAgency('Crossref');
        await expect(settings.field('depositorName')).toHaveValue(DEPOSITOR.depositorName);
        await expect(settings.field('depositorEmail')).toHaveValue(DEPOSITOR.depositorEmail);
        await settings.goto('Setup');
        expect(await settings.kinds()).toEqual(KINDS.map((label) => ({label, checked: label === 'Preprints'})));
    });

    test('S13: deposit DOIs with Crossref', async ({browser, baseURL, asUser, opsApi, pkpMail}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s13', testInfo);
        const {manager, ada, mary} = await seedServer(opsApi, tag, {
            doiPrefix: PREFIX,
            plugins: {crossrefplugin: {enabled: true, settings: DEPOSITOR}},
            registrationAgency: 'crossrefplugin',
        });
        const axolotl = await seedPreprint(opsApi, tag, 'ax', ada, AXOLOTL, {published: true});
        const tardigrade = await seedPreprint(opsApi, tag, 'ta', mary, TARDIGRADE, {published: true});
        const coral = await seedPreprint(opsApi, tag, 'co', mary, CORAL, {published: true});
        const moss = await seedPreprint(opsApi, tag, 'mo', ada, MOSS);
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const axRow = dois.row(axolotl.submissionId);
        const taRow = dois.row(tardigrade.submissionId);
        const coRow = dois.row(coral.submissionId);
        const moRow = dois.row(moss.submissionId);

        // What the page offers (Rules 24, 36).
        await dois.goto();
        await expect(dois.depositAllButton()).toBeVisible();
        expect(await dois.bulkLabels()).toEqual([
            'Select All',
            'Expand all',
            'Export DOIs',
            'Mark DOIs Registered',
            'Mark DOIs Unregistered',
            'Mark DOIs Needs Sync',
            'Assign DOIs',
            'Deposit DOIs',
        ]);
        await dois.closeBulkActions();
        for (const r of [axRow, taRow, coRow]) await expect(dois.rowBadge(r)).toHaveText('Unregistered');

        // The agency panel (Rule 30).
        await dois.expand(moRow, moss.submissionId);
        await expect(dois.agencyName(moRow)).toHaveText('Crossref');
        await expect(dois.agencySentence(moRow)).toHaveText(TEXT.notPublished);
        await expect(dois.agencyButtons(moRow)).toHaveCount(0);
        await dois.expand(axRow, axolotl.submissionId);
        await expect(dois.agencyName(axRow)).toHaveText('Crossref');
        await expect(dois.agencySentence(axRow)).toHaveText(TEXT.notSubmitted('Crossref'));
        await expect(dois.agencyButtons(axRow)).toHaveText(['Deposit DOI(s)']);

        // Registered by hand: "manually registered", no button (Rule 30).
        await dois.runBulk('Mark DOIs Registered', [tardigrade.submissionId]);
        await expect(dois.rowBadge(taRow)).toHaveText('Registered');
        await dois.expand(taRow, tardigrade.submissionId);
        await expect(dois.agencySentence(taRow)).toHaveText(TEXT.manuallyRegistered);
        await expect(dois.agencyButtons(taRow)).toHaveCount(0);

        // "Export DOIs" with an unposted preprint: the question; nothing
        // downloads (Rule 29; A13 not asserted).
        /** @type {string[]} */
        const downloads = [];
        page.on('download', (d) => downloads.push(d.suggestedFilename()));
        await dois.tick([axolotl.submissionId, moss.submissionId]);
        const exporting = await dois.chooseBulkAction('Export DOIs');
        await expect(exporting).toContainText(TEXT.exportQuestion(2, 'Crossref'));
        const exported = await dois.confirmAction(exporting, 'Export DOIs');
        expect(exported.status(), 'the export is refused').toBe(400);
        expect(exported.headers()['content-disposition'] || '').not.toContain('attachment');
        expect(downloads).toEqual([]);

        // "Deposit DOIs" with an unposted preprint: the question; nothing
        // marked (Rule 29; A13 not asserted).
        await dois.tick([axolotl.submissionId, moss.submissionId]);
        const depositing = await dois.chooseBulkAction('Deposit DOIs');
        await expect(depositing).toContainText(TEXT.depositQuestion(2, 'Crossref'));
        const refused = await dois.confirmAction(depositing, 'Deposit DOIs');
        expect(refused.status(), 'the deposit is refused').toBe(400);
        await expect(dois.rowBadge(axRow)).toHaveText('Unregistered');
        await expect(dois.rowBadge(moRow)).toHaveText('Unpublished');

        // "Deposit DOIs": "Submitted" at once, "Edit" greyed (Rules 19, 29,
        // 32; A4 not asserted).
        const deposited = await dois.runBulk('Deposit DOIs', [axolotl.submissionId]);
        expect(deposited.status()).toBe(200);
        await dois.expectNotice(TEXT.depositQueued);
        await expect(dois.rowBadge(axRow)).toHaveText('Submitted');
        await dois.expand(axRow, axolotl.submissionId);
        await expect(dois.doiBadge(axRow, PREPRINT)).toHaveText('Submitted');
        await expect(dois.editButton(axRow)).toBeDisabled();

        // "Deposit All" (Rule 29).
        await expect(dois.rowBadge(coRow)).toHaveText('Unregistered');
        await dois.depositAllButton().click();
        const all = dois.dialog(TEXT.depositAllTitle);
        await expect(all).toBeVisible();
        await expect(all).toContainText(TEXT.depositAllQuestion('Crossref'));
        await expect(all.getByRole('button', {name: TEXT.depositAllTitle, exact: true})).toBeVisible();
        await expect(all.getByRole('button', {name: 'Cancel', exact: true})).toBeVisible();
        const depositedAll = await dois.confirmAction(all, TEXT.depositAllTitle);
        expect(depositedAll.status()).toBe(200);
        await dois.expectNotice(TEXT.depositQueued);
        await expect(dois.rowBadge(coRow)).toHaveText('Submitted');

        // Control: "Registered" and "Unpublished" untouched (Rules 16, 29).
        await expect(dois.rowBadge(taRow)).toHaveText('Registered');
        await expect(dois.rowBadge(moRow)).toHaveText('Unpublished');

        // No mail about the deposits (Side effects), bounded by the control.
        await expectNoMailBesidesControl(browser, baseURL, pkpMail, tag, manager, [ada, mary]);
    });
});
