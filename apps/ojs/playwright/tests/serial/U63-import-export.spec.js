// @ts-check
/**
 * @file playwright/tests/serial/U63-import-export.spec.js
 *
 * Import & export — the OJS scenario that cannot run beside the parallel
 * suite: S10 puts a scratch journal on "DOI Versioning" "Yes", and while
 * any journal of the install is set so, every OJS OAI list request answers
 * 500 (spec footnote sc; scenarios.md `doiVersioning`), which would red the
 * U19 suite running in the parallel `ojs` project. Here it runs after it,
 * in `ojs-serial`, where no spec reads OAI, and it sets its journal back
 * to "No" on screen in a `finally`, so a failed assertion cannot leave the
 * install's OAI failing.
 * Spec: docs/specs/U63-import-export.md
 *
 * Coverage boundaries are declared in the parallel suite's header
 * (playwright/tests/U63-import-export.spec.js).
 *
 * Seeding (footnote sc): a scratch journal with a throwaway Journal
 * Manager and Author "Ada Lovelace": `enableDois`, `doiPrefix`,
 * `doiVersioning`, a published issue, one article seeded `published` into
 * it. The versions 1.1, 2.0 and 2.1 are made on screen ("Create New
 * Version"), since no key makes one.
 */
const {test, expect} = require('../../support/fixtures.js');
const {DoiSettings} = require('../../../../../shared/playwright/pages/DoisPages.js');
const {DoajPage, recordToolNotices} = require('../../../../../shared/playwright/pages/ImportExportPages.js');
const {PublishScreen} = require('../../pages/PublishSchedulePages.js');

const T = 30_000;
const OKAPI = 'Okapi forest census';
const PUBLISHED_ISSUE = {volume: 1, number: 1, year: 2025};

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u63${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: `${username}@mail.test`, roles};
}

/**
 * "DOI Versioning" set back to "No" on the Setup tab and saved: the
 * install's OAI answers again. Run from a `finally`; a refusal here is
 * reported, not swallowed.
 */
async function restoreVersioningNo(page, tag) {
    const settings = new DoiSettings(page, tag);
    await settings.goto('Setup');
    if (!(await settings.versioningRadio('No').isChecked())) {
        await settings.versioningRadio('No').check();
        await settings.save(settings.setup);
    }
}

/** "Create New Version" on the version open ('true' "Minor Revision", 'false' "Major"); returns its publication id. */
async function createVersion(page, tag, isMinor) {
    const publish = new PublishScreen(page, tag);
    const dialog = await publish.openCreateVersionDialog();
    await dialog.locator('select[name="versionStage"]').selectOption('VoR');
    await dialog.locator('select[name="versionIsMinor"]').selectOption(isMinor);
    return publish.confirmVersionDialog(dialog);
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
    await expect(window).toBeVisible({timeout: T});
    await publish.confirmPublish(window, 'Publish');
    await expect(page.getByRole('button', {name: 'Unpublish', exact: true})).toBeVisible({timeout: T});
}

/** The "Publication Stage" cells of the Publications list, sorted. */
async function stages(doaj) {
    await doaj.expectListLoaded();
    return (await doaj.rows().evaluateAll((trs) => trs.map((tr) => (/** @type {HTMLElement} */ (tr.querySelectorAll('td')[2])?.innerText || '').trim()))).sort();
}

test.describe('Import & export (serial)', () => {
    test('S10: DOAJ with "DOI Versioning"', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(360_000);
        const tag = makeTag('s10', testInfo);
        const manager = `${tag}mg`;
        const ada = `${tag}al`;
        await ojsApi.createContext({
            tag,
            context: {contactName: 'Pat Contact', contactEmail: `${tag}pc@mail.test`, country: 'CA'},
            users: [user(manager, 'Mona', 'Manager', ['manager']), user(ada, 'Ada', 'Lovelace', ['author'])],
            enableDois: true,
            doiPrefix: '10.1234',
            doiVersioning: true,
            issues: [{...PUBLISHED_ISSUE, published: true}],
        });
        const page = await (await asUser(manager)).newPage();
        await recordToolNotices(page);
        try {
            const okapi = await ojsApi.createSubmission({tag: `${tag}ok`, context: tag, submitter: ada, title: OKAPI, published: true, issue: PUBLISHED_ISSUE});
            const doaj = new DoajPage(page, tag);
            const publish = new PublishScreen(page, tag);
            const openPublications = async () => {
                await doaj.goto();
                await doaj.openListTab('Publications');
            };

            // The tabs: "Settings" and "Publications" (Rule 34; Settings bullet 5).
            await doaj.goto();
            await doaj.expectTabs(['Settings', 'Publications']);

            // The Publications tab: title, columns, one row "VoR 1.0" "Not
            // Deposited" (Rule 45; Fields).
            await doaj.openListTab('Publications');
            await expect(doaj.gridTitle()).toHaveText('Publications');
            await expect(doaj.columns()).toHaveText(['Select', 'Submission ID', 'Publication Stage', 'Author; Title', 'Status']);
            await expect(doaj.rows()).toHaveCount(1);
            expect(await doaj.rowCells('VoR 1.0')).toEqual(['', String(okapi.submissionId), 'VoR 1.0', `Lovelace; ${OKAPI}`, 'Not Deposited']);

            // A minor version 1.1, published: the row reads "VoR 1.1" (Rule 45).
            await publish.gotoVersionPage(okapi.submissionId, okapi.publicationId, 'titleAbstract', 'Title & Abstract');
            const v11 = await createVersion(page, tag, 'true');
            await publish.gotoVersionPage(okapi.submissionId, v11, 'titleAbstract', 'Title & Abstract');
            await publishOpenVersion(page, tag);
            await openPublications();
            expect(await stages(doaj)).toEqual(['VoR 1.1']);

            // A major version 2.0, published: "VoR 1.1" and "VoR 2.0" (Rule 45).
            await publish.gotoVersionPage(okapi.submissionId, v11, 'titleAbstract', 'Title & Abstract');
            const v20 = await createVersion(page, tag, 'false');
            await publish.gotoVersionPage(okapi.submissionId, v20, 'titleAbstract', 'Title & Abstract');
            await publishOpenVersion(page, tag);
            await openPublications();
            expect(await stages(doaj)).toEqual(['VoR 1.1', 'VoR 2.0']);

            // An unpublished 2.1: the same two rows (Rule 45).
            await publish.gotoVersionPage(okapi.submissionId, v20, 'titleAbstract', 'Title & Abstract');
            await createVersion(page, tag, 'true');
            await openPublications();
            expect(await stages(doaj)).toEqual(['VoR 1.1', 'VoR 2.0']);

            // "Mark registered" on "VoR 2.0" (Rules 41, 45).
            await doaj.rowBox('VoR 2.0').check();
            await doaj.pressAndLand('markRegistered');
            await doaj.expectSelected('Publications');
            await expect(doaj.status('VoR 2.0')).toHaveText('Marked registered');
            await expect(doaj.status('VoR 1.1')).toHaveText('Not Deposited');

            // "DOI Versioning" back to "No": "Settings" and "Articles" (Rule 34).
            await restoreVersioningNo(page, tag);
            await doaj.goto();
            await doaj.expectTabs(['Settings', 'Articles']);

            // Control: on "Articles" the article reads "Not Deposited" (Rule 45).
            await doaj.openListTab('Articles');
            await expect(doaj.rows()).toHaveCount(1);
            await expect(doaj.status(`Lovelace; ${OKAPI}`)).toHaveText('Not Deposited');
        } finally {
            await restoreVersioningNo(page, tag);
        }
    });
});
