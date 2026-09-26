// @ts-check
/**
 * @file playwright/tests/serial/U45-dois.spec.js
 *
 * DOIs — the two OJS scenarios that cannot run beside the parallel suite:
 * S11 and S15 put a scratch journal on "DOI Versioning" "Yes", and while
 * any journal of the install is set so, every OJS OAI request answers 500
 * (U19 A22, spec Rule 12), which would red the U19 suite running in the
 * parallel `ojs` project. Here they run after it, in `ojs-serial`, and
 * each sets its journal back to "No" on screen in a `finally`, so a
 * failed assertion cannot leave the install's OAI failing.
 * Spec: docs/specs/U45-dois.md
 *
 * Coverage boundaries are declared in the parallel suite's header
 * (playwright/tests/U45-dois.spec.js); this file adds only:
 * - S11 reads the "View all" window's block headings by the version's
 *   name and the words after it ("(date)" / "Unpublished"), never the date
 *   itself;
 * - S15's Crossmark button is read as the side column's last block with
 *   the logo named "Crossmark"; the window it opens (Crossref's own site)
 *   is not pressed.
 *
 * Seeding: scenario endpoints only, a scratch journal with a throwaway
 * Journal Manager and Author (footnote sc): `doiPrefix`, `doiVersioning`,
 * the Crossref plugin with its depositor fields and `registrationAgency`,
 * a work seeded `published`. The typed DOI carries the run's tag (Rule 9).
 */
const {test, expect} = require('../../support/fixtures.js');
const {ArticleLandingPage} = require('../../../../../shared/playwright/pages/ArticleLandingPages.js');
const {
    DoiSettings,
    DoisPage,
    recordNotices,
    defaultDoiPattern,
    readerDoiItem,
    readerDoiLink,
    crossmarkBlock,
} = require('../../../../../shared/playwright/pages/DoisPages.js');
const {PublishScreen} = require('../../pages/PublishSchedulePages.js');
const {PublicationScreen} = require('../../pages/PublicationMetadataPages.js');

const PREFIX = '10.1234';
const MADE = defaultDoiPattern(PREFIX);
const ARTICLE = 'Article';
const AXOLOTL = 'Axolotl limb memory';
const DEPOSITOR = {depositorName: 'Public Knowledge Project', depositorEmail: 'doi@mail.test'};
const VERSIONING_YES = 'Yes, assign a unique DOI to every version of an article.';
const VERSIONING_NO = 'No, all versions of an article should have the same DOI.';
const CROSSMARK_SENTENCE =
    'Enable participation in Crossmark to allow readers to check the publication status of articles. Learn more.';

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u45${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: `${username}@mail.test`, roles};
}

/** Seed a scratch journal with a throwaway Journal Manager and Author ("Ada Lovelace"). */
async function seedJournal(ojsApi, tag, keys) {
    await ojsApi.createContext({
        tag,
        users: [user(`${tag}mg`, 'Mona', 'Manager', ['manager']), user(`${tag}al`, 'Ada', 'Lovelace', ['author'])],
        ...keys,
    });
    return {manager: `${tag}mg`, ada: `${tag}al`};
}

/** A page as `username`, every browser dialog accepted. */
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

/** A version's page signed out: its "DOI:" line reads `doi`. */
async function expectReaderDoi(reader, tag, submissionId, doi, {version} = {}) {
    const landing = new ArticleLandingPage(reader, tag);
    await landing.goto(submissionId, version === undefined ? {} : {version});
    await expect(readerDoiItem(reader).locator('h2.label')).toHaveText(/^\s*DOI:\s*$/);
    await expect(readerDoiLink(reader)).toHaveText(`https://doi.org/${doi}`);
}

/**
 * "DOI Versioning" set back to "No" on the Setup tab and saved: the
 * install's OAI answers again (U19 A22). Run from a `finally`; a refusal
 * here is reported, not swallowed.
 */
async function restoreVersioningNo(page, tag) {
    const settings = new DoiSettings(page, tag);
    await settings.goto('Setup');
    if (!(await settings.versioningRadio('No').isChecked())) {
        await settings.versioningRadio('No').check();
        await settings.save(settings.setup);
    }
}

/** The publish confirmation window (publish or schedule). */
function publishWindow(page) {
    return page.getByRole('dialog').filter({hasText: /Are you sure you want to (publish|schedule) this/}).last();
}

/**
 * Publish the version open on the workflow: through the "Review
 * Publishing Details" panel when it opens (its empty boxes filled),
 * straight to the confirmation window otherwise.
 */
async function publishOpenVersion(page, tag) {
    const publish = new PublishScreen(page, tag);
    const window = publishWindow(page);
    const panel = await publish.pressPublish({or: window});
    if (panel) {
        for (const [name, value] of [['versionStage', 'VoR'], ['versionIsMinor', 'false']]) {
            const box = panel.locator(`select[name="${name}"]`);
            if ((await box.count()) > 0 && (await box.isVisible()) && !(await box.inputValue())) {
                await box.selectOption(value);
            }
        }
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
    }
    await expect(window).toBeVisible({timeout: 30_000});
    await publish.confirmPublish(window, 'Publish');
    await expect(page.getByRole('button', {name: 'Unpublish', exact: true})).toBeVisible({timeout: 30_000});
}

/**
 * "Create New Version" on the version open, its "Revision Significance"
 * chosen ('false' "Major Revision", 'true' "Minor Revision"); returns the
 * new version's publication id.
 */
async function createVersion(page, tag, isMinor) {
    const publish = new PublishScreen(page, tag);
    const dialog = await publish.openCreateVersionDialog();
    await dialog.locator('select[name="versionStage"]').selectOption('VoR');
    await dialog.locator('select[name="versionIsMinor"]').selectOption(isMinor);
    return publish.confirmVersionDialog(dialog);
}

test.describe('DOIs (serial)', () => {
    test('S11: a DOI per major version ("DOI Versioning" "Yes")', async ({browser, baseURL, asUser, ojsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s11', testInfo);
        const {manager, ada} = await seedJournal(ojsApi, tag, {doiPrefix: PREFIX, doiVersioning: true});
        const page = await pageAs(asUser, manager);
        try {
            const axolotl = await ojsApi.createSubmission({tag: `${tag}ax`, context: tag, submitter: ada, title: AXOLOTL, published: true});
            const dois = new DoisPage(page, tag);
            const screen = new PublicationScreen(page, tag);
            const reader = await readerPage(browser, baseURL);
            const changed = `${PREFIX}/e2e-v2-${tag}`;
            const row = dois.row(axolotl.submissionId);

            // Control: before the major version, no "There are … versions."
            // and no "View all" (Rule 20).
            await dois.goto();
            await dois.expand(row, axolotl.submissionId);
            const doi1 = await dois.doiBox(row, ARTICLE).inputValue();
            expect(doi1).toMatch(MADE);
            await expect(dois.editButton(row)).toBeVisible();
            await expect(dois.versionsBar(row)).toHaveCount(0);

            // A major version: "There are 2 versions." with "View all"; the
            // window's blocks, the new one "Unpublished" without a DOI
            // (Rules 12, 20).
            await screen.gotoVersionPage(axolotl.submissionId, axolotl.publicationId, 'titleAbstract', 'Title & Abstract');
            const majorId = await createVersion(page, tag, 'false');
            await dois.goto();
            await dois.expand(row, axolotl.submissionId);
            await expect(dois.versionsBar(row)).toContainText('There are 2 versions.');
            await expect(dois.viewAllButton(row)).toBeVisible();
            await dois.openVersionsWindow(row);
            await expect(dois.versionHeadings()).toHaveText([
                /^\s*Version of Record 1\.0 \(.+\)\s*$/,
                /^\s*Version of Record 2\.0 Unpublished\s*$/,
            ]);
            await expect(dois.versionDoiBox(dois.versionBlock('Version of Record 1.0'), ARTICLE)).toHaveValue(doi1);
            await expect(dois.versionDoiBox(dois.versionBlock('Version of Record 2.0'), ARTICLE)).toHaveValue('');
            await dois.closeVersionsWindow();

            // The major version published: a DOI of its own; its page shows
            // it, 1.0's page keeps 1.0's (Rules 12, 43).
            await screen.gotoVersionPage(axolotl.submissionId, majorId, 'titleAbstract', 'Title & Abstract');
            await publishOpenVersion(page, tag);
            await dois.goto();
            await dois.expand(row, axolotl.submissionId);
            await dois.openVersionsWindow(row);
            const block2 = dois.versionBlock('Version of Record 2.0');
            await expect(dois.versionDoiBox(block2, ARTICLE)).toHaveValue(MADE);
            const doi2 = await dois.versionDoiBox(block2, ARTICLE).inputValue();
            expect(doi2).not.toBe(doi1);
            await dois.closeVersionsWindow();
            await expectReaderDoi(reader, tag, axolotl.submissionId, doi2);
            await expectReaderDoi(reader, tag, axolotl.submissionId, doi1, {version: axolotl.publicationId});

            // A minor version: still "There are 2 versions."; the window holds
            // 1.0's block and 2.1's, "Unpublished", with 2.0's DOI (Rules 12, 20).
            await screen.gotoVersionPage(axolotl.submissionId, majorId, 'titleAbstract', 'Title & Abstract');
            await createVersion(page, tag, 'true');
            await dois.goto();
            await dois.expand(row, axolotl.submissionId);
            await expect(dois.versionsBar(row)).toContainText('There are 2 versions.');
            await dois.openVersionsWindow(row);
            await expect(dois.versionHeadings()).toHaveText([
                /^\s*Version of Record 1\.0 \(.+\)\s*$/,
                /^\s*Version of Record 2\.1 Unpublished\s*$/,
            ]);
            const block21 = dois.versionBlock('Version of Record 2.1');
            await expect(dois.versionDoiBox(block21, ARTICLE)).toHaveValue(doi2);

            // One "Edit" for the window: 2.1's DOI changed; 2.0's page shows
            // it, 1.0's keeps its own (Rules 12, 20, 43).
            await expect(dois.versionsEditButton()).toHaveText(/^\s*Edit\s*$/);
            await dois.versionsEditButton().click();
            await expect(dois.versionsEditButton()).toHaveText(/^\s*Save\s*$/);
            await dois.versionDoiBox(block21, ARTICLE).fill(changed);
            const saved = page.waitForResponse((r) => /\/api\/v1\/dois\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 30_000});
            await dois.versionsEditButton().click();
            expect((await saved).status()).toBe(200);
            await dois.expectNotice('DOI(s) successfully updated');
            await expectReaderDoi(reader, tag, axolotl.submissionId, changed, {version: majorId});
            await expectReaderDoi(reader, tag, axolotl.submissionId, doi1, {version: axolotl.publicationId});
            await reader.context().close();
        } finally {
            await restoreVersioningNo(page, tag);
        }
    });

    test('S15: Crossmark and "Update Policy DOI"', async ({browser, baseURL, asUser, ojsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s15', testInfo);
        const {manager, ada} = await seedJournal(ojsApi, tag, {
            doiPrefix: PREFIX,
            doiVersioning: false,
            plugins: {crossrefplugin: {enabled: true, settings: DEPOSITOR}},
            registrationAgency: 'crossrefplugin',
        });
        const page = await pageAs(asUser, manager);
        try {
            const axolotl = await ojsApi.createSubmission({tag: `${tag}ax`, context: tag, submitter: ada, title: AXOLOTL, published: true});
            const settings = new DoiSettings(page, tag);
            const reader = await readerPage(browser, baseURL);
            const landing = new ArticleLandingPage(reader, tag);
            const policy = settings.field('updatePolicyDoi');
            const expectButton = async (shown) => {
                await landing.goto(axolotl.submissionId);
                await expect(readerDoiItem(reader)).toBeVisible();
                if (shown) {
                    await expect(landing.sideColumn().locator(':scope > *').last()).toHaveClass(/\bcrossmark\b/);
                    await expect(crossmarkBlock(reader).getByRole('img', {name: 'Crossmark'})).toBeVisible({timeout: 30_000});
                } else {
                    await expect(crossmarkBlock(reader)).toHaveCount(0);
                }
            };

            // Control: before "Crossmark" is saved ticked, no button (Rule 42).
            await expectButton(false);

            // As it arrives: "Crossmark" unticked, no "Update Policy DOI"
            // (Fields; Rule 38).
            await settings.goto('Registration');
            await expect(settings.field('depositorName')).toHaveValue(DEPOSITOR.depositorName);
            await expect(settings.crossmarkBox()).not.toBeChecked();
            await expect(settings.crossmarkBox()).toHaveAccessibleName(CROSSMARK_SENTENCE);
            await expect(policy).toHaveCount(0);

            // Versioning "Yes": "Update Policy DOI" shows, starred; "No": hidden
            // again (Rule 38).
            await settings.openSideTab('Setup');
            await settings.versioningRadio('Yes').check();
            await expect(settings.versioningRadio('Yes')).toHaveAccessibleName(VERSIONING_YES);
            await settings.save(settings.setup);
            await settings.goto('Registration');
            await expect(policy).toBeVisible();
            await expect(policy).toHaveJSProperty('required', true);
            await expect(settings.crossmarkBox()).not.toBeChecked();
            await settings.openSideTab('Setup');
            await settings.versioningRadio('No').check();
            await expect(settings.versioningRadio('No')).toHaveAccessibleName(VERSIONING_NO);
            await settings.save(settings.setup);
            await settings.goto('Registration');
            await expect(settings.crossmarkBox()).toBeVisible();
            await expect(policy).toHaveCount(0);

            // Crossmark ticked: "Update Policy DOI", starred; "policy" refused,
            // "10.1234/policy" saved (Fields; Rule 38).
            await settings.crossmarkBox().check();
            await expect(policy).toBeVisible();
            await expect(policy).toHaveJSProperty('required', true);
            await policy.fill('policy');
            await settings.saveRefused(settings.registration, policy, 'This is not formatted correctly.');
            await policy.fill(`${PREFIX}/policy`);
            await settings.save(settings.registration);

            // The article's page: the Crossmark button, last in the side column
            // (Rule 42).
            await expectButton(true);

            // "None" saved: the button stays (Rule 42).
            await settings.goto('Registration');
            await settings.chooseAgency('None');
            await settings.save(settings.registration);
            await expectButton(true);

            // The plugin disabled: the button gone (Rule 42).
            await settings.gotoPlugins('crossrefplugin');
            await settings.setPluginEnabled('crossrefplugin', false);
            await expectButton(false);
            await reader.context().close();
        } finally {
            await restoreVersioningNo(page, tag);
        }
    });
});
