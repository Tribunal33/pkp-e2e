// @ts-check
/**
 * @file playwright/tests/U40-publication-metadata.spec.js
 *
 * Publication metadata — OJS suite, one test per canonical scenario the
 * spec runs on OJS (S1–S8 and S12 common; S9 {OJS}; scenarios 10 and 11
 * are OMP's and OPS's, in their trees). Scenario 3's journal-only
 * scheduled leg and scenario 6's visibility controls run as the tail of
 * S3 and S6 (one test per scenario; the scheduled leg's second submission
 * is seeded in S3 itself).
 * Spec: docs/specs/U40-publication-metadata.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A1 🐞
 * (no test sets Plain Language Summary to "Require"; S2 enables it at
 * "Ask"), A2 🐞 / A3 ❓ (S7 and S9 assert only the scenarios' own
 * sentences after the reset: the published item's rewrite and, on the
 * issue basis, the unpublished item's current year; the 1970 year and the
 * per-version log lines are not asserted), A5 ❓ (S3 reaches "Scheduled"
 * and checks the edit lock, the new version and the empty Permissions &
 * Disclosure, never the language button), A6 ❓ (S6 asserts only the
 * "Change" button's absence once published or versioned), A8 ❓ (S3 and
 * S12 assert only the scenarios' own sentences: Save disabled, the fields
 * shown, nothing typed kept), A10 ✅ retired 2026-09-21 (no term suggestion is asserted),
 * A11 ❓ (the automatic holder's description is asserted only up to the
 * contributor's name), A12 ❓ (no empty custom copyright statement), A13 🐞
 * (S7's Cancel leg asserts only that nothing was reset and reloads before
 * the second attempt), A14 ❓ (S6's empty-abstract Confirm refusal is
 * asserted as the scenario writes it, not the "recommended" wording),
 * A15 🐞 (S6 gates the language panel on its own loading before picking),
 * A17 ❓ (the Author's Contributors page on the new version is not
 * opened), OJS1 🐞 (scenario 6's leg on an article published as Author
 * Original is skipped), OJS2 ❓ (no scheduled article's
 * terms are read as suggestions), OMP1–OMP5 and OPS1–OPS2 (press- and
 * preprint-only, in those trees). The spec's Coverage section records
 * everything else left out.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only for settings (S1, S3, S4 and S12 touch only their own
 * seeded submissions there — S3's scheduled leg schedules its own
 * submission into the seeded, never-published future issue Vol. 2 No. 1
 * (2015), as U49 S9 does; S12 changes the Copyeditor's assignment on its
 * own scratch submission only; every settings mutation runs on a scratch
 * journal with throwaway users). Mailbox absences (S1, S7) are read in
 * the shared Mailpit scoped to a throwaway address the test created, and
 * bounded by a mail the test itself sends the same way — the manager's
 * "Notify" on a spare participant (A8, M4); S1's throwaway accounts live
 * on a scratch context and submit to the seeded journal. Every absence
 * is read with a settled locator and paired with a positive control taken
 * the same way (M6). Waits are event-based (API responses, web-first
 * assertions, jQuery idle for legacy grids) — no hard sleeps. Everything
 * runs in the parallel `ojs` project.
 */
const {test, expect} = require('../support/fixtures.js');
const {
    PublicationScreen,
    createIssue,
    publishIssue,
    setBackIssueDate,
    waitForContextSettingsSave,
} = require('../pages/PublicationMetadataPages.js');
const {ContributorsPanel} = require('../pages/ContributorPages.js');
const {stubRegistrySearch} = require('../pages/FundingPages.js');
const {
    EditorialDashboardPage,
} = require('../../../../shared/playwright/pages/EditorialDashboardPage.js');
const {TasksPanel} = require('../../../../shared/playwright/pages/NotificationsPages.js');

const JOURNAL = 'publicknowledge';
const PUBLISHED_WARNING =
    'Warning: This version has been published. Editing it may impact the published content.';
const NOTIFY_SUBJECT = 'Discussion (Submission)';

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u40${scenario}w${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/**
 * Seed a scratch journal with one throwaway manager and one throwaway
 * author (plus, with `spare`, a third author-role account the mailbox
 * controls are addressed to); returns their usernames.
 *
 * @param {{bilingual?: boolean, spare?: boolean, sections?: object[]}} options
 */
async function seedJournal(ojsApi, tag, {bilingual = false, spare = false, sections} = {}) {
    const context = bilingual
        ? {
              primaryLocale: 'en',
              supportedLocales: ['en', 'fr_CA'],
              supportedSubmissionLocales: ['en', 'fr_CA'],
          }
        : undefined;
    const users = [
        {
            username: `${tag}mg`,
            givenName: 'Mona',
            familyName: 'Manager',
            email: mailOf(`${tag}mg`),
            roles: ['manager'],
        },
        {
            username: `${tag}au`,
            givenName: 'Ada',
            familyName: 'Author',
            email: mailOf(`${tag}au`),
            roles: ['author'],
        },
    ];
    if (spare) {
        users.push({
            username: `${tag}x`,
            givenName: 'Xena',
            familyName: 'Spare',
            email: mailOf(`${tag}x`),
            roles: ['author'],
        });
    }
    await ojsApi.createContext({
        tag,
        ...(context ? {context} : {}),
        ...(sections ? {sections} : {}),
        users,
    });
    return {manager: `${tag}mg`, author: `${tag}au`, spare: spare ? `${tag}x` : null};
}

/** Open Settings › Workflow › Metadata and wait for its checkboxes. */
async function openMetadataSettings(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/management/settings/workflow`);
    await page.locator('#metadata-button').click();
    await expect(
        page.getByRole('checkbox', {name: 'Enable keyword metadata'})
    ).toBeVisible({timeout: 30_000});
}

/** The Metadata settings form (the one carrying the enable switches). */
function metadataSettingsForm(page) {
    return page
        .locator('form')
        .filter({has: page.getByRole('checkbox', {name: 'Enable keyword metadata'})});
}

/** Save the Metadata settings form, bounded by the context API answering. */
async function saveMetadataSettings(page) {
    const saved = waitForContextSettingsSave(page);
    await metadataSettingsForm(page)
        .getByRole('button', {name: 'Save', exact: true})
        .click();
    await saved;
}

/**
 * Configure Settings › Distribution › License on a scratch journal:
 * optional Copyright Holder radio, license radio, and License Terms text.
 */
async function configureLicenseSettings(page, contextPath, {holder, license, terms} = {}) {
    await page.goto(`/index.php/${contextPath}/management/settings/distribution`);
    await page.locator('#license-button').click();
    const anchor = page.getByRole('radio', {name: 'CC Attribution 4.0', exact: true});
    await expect(anchor).toBeVisible({timeout: 30_000});
    if (holder) {
        await page.getByRole('radio', {name: holder, exact: true}).check();
    }
    if (license) {
        await page.getByRole('radio', {name: license, exact: true}).check();
    }
    if (terms) {
        await page.waitForFunction(
            () => !!window.tinymce?.get('license-licenseTerms-control-en')?.initialized,
            undefined,
            {timeout: 30_000}
        );
        await page.evaluate((value) => {
            const editor = window.tinymce.get('license-licenseTerms-control-en');
            editor.setContent(value);
            editor.fire('change');
        }, terms);
    }
    const saved = waitForContextSettingsSave(page);
    await page
        .locator('form')
        .filter({has: anchor})
        .getByRole('button', {name: 'Save', exact: true})
        .click();
    await saved;
}

/** Open Tools › Permissions and wait for its "Reset Article Permissions" button. */
async function openPermissionsTools(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/management/tools`);
    await page
        .getByRole('tab', {name: 'Permissions'})
        .or(page.getByRole('link', {name: 'Permissions'}))
        .first()
        .click();
    await expect(
        page.getByRole('button', {name: 'Reset Article Permissions'})
    ).toBeVisible({timeout: 30_000});
}

/**
 * Press "Reset Article Permissions", accept the browser's confirm box and
 * wait for the reset to answer and its toast to show.
 */
async function resetPermissions(page, contextPath) {
    await openPermissionsTools(page, contextPath);
    // Prepended: setBackIssueDate leaves a listener that dismisses every
    // non-beforeunload dialog, and listeners run in order (the second
    // handler's accept would throw on a dialog already dismissed).
    page.prependOnceListener('dialog', (dialog) => dialog.accept());
    const reset = page.waitForResponse(
        (r) => r.url().includes('resetPermissions') && r.ok(),
        {timeout: 30_000}
    );
    await page.getByRole('button', {name: 'Reset Article Permissions'}).click();
    await reset;
    await expect(
        page.getByText('Article permissions were successfully reset.')
    ).toBeVisible({timeout: 30_000});
}

/**
 * Arm a listener that records every browser dialog (and dismisses it) so a
 * "no prompt appeared" claim reads what the browser raised; returns the
 * list and a disarm function.
 */
function armDialogWatch(page) {
    const dialogs = [];
    const onDialog = (dialog) => {
        dialogs.push(dialog.type());
        dialog.dismiss().catch(() => {});
    };
    page.on('dialog', onDialog);
    return {dialogs, disarm: () => page.off('dialog', onDialog)};
}

/** The in-app prompt a leave-with-unsaved-changes guard would raise. */
function unsavedPrompt(page) {
    return page.getByRole('dialog').filter({hasText: /unsaved|discard|leave this page/i});
}

// Traces are kept for this file's failures (docs/tracking/ci-triage.md flake
// watch, 2026-09-15): S3's Title & Abstract section rendered empty once in a
// local run, and the option is worker-scoped, so it cannot sit on the one test.
test.use({trace: 'retain-on-failure'});

test.describe('publication metadata', () => {
    test('S1: edit the title and abstract; an empty title is refused', {tag: '@smoke'}, async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s1', testInfo);
        const controlTag = makeTag('s1c', testInfo);
        // The throwaway Author (the mailbox the absence is read in) and a
        // spare account (the control mail's recipient) are created on a
        // scratch context — users are created there and nowhere else — and
        // each submits to the seeded journal, where the scenario runs.
        const {author, spare} = await seedJournal(ojsApi, tag, {spare: true});
        const [{submissionId}, control] = await Promise.all([
            ojsApi.createSubmission({
                tag,
                context: JOURNAL,
                submitter: author,
                title: `Submission ${tag}`,
            }),
            ojsApi.createSubmission({
                tag: controlTag,
                context: JOURNAL,
                submitter: spare,
                title: `Submission ${controlTag}`,
            }),
        ]);

        const page = await (await asUser('manager.maya')).newPage();
        const pub = new PublicationScreen(page, JOURNAL);
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Title & Abstract');

        // The page carries Prefix (with its guidance), Title, Subtitle and
        // Abstract, prefilled with the author's entries.
        await expect(page.getByText('Examples: A, The')).toBeVisible();
        await expect(page.locator('input[name="prefix-en"]')).toBeVisible();
        expect(await pub.richTextContent('titleAbstract-title-control-en')).toBe(
            `Submission ${tag}`
        );
        expect(await pub.richTextContent('titleAbstract-abstract-control-en')).toContain(
            'Seeded abstract'
        );

        // Prefix, subtitle, an italic title (via the "Formatting" menu the
        // one-line editors keep behind focus) and a new abstract; Save
        // ("Saved" #1).
        await page.locator('input[name="prefix-en"]').fill('The');
        await pub.setRichText('titleAbstract-subtitle-control-en', `Subtitle ${tag}`);
        await pub.applyFormattingCommand('titleAbstract-title-control-en', 'Italic');
        await pub.setRichText(
            'titleAbstract-abstract-control-en',
            `<p>Abstract ${tag} revised</p>`
        );
        await pub.save();

        // Clearing the required Title refuses the save in place: summary,
        // per-field jump buttons and the field message; nothing is saved.
        await pub.setRichText('titleAbstract-title-control-en', '');
        await pub.saveButton().click();
        await expect(page.getByText('Please correct one error.')).toBeVisible({
            timeout: 30_000,
        });
        await expect(pub.fieldError('This field is required.').first()).toBeVisible();
        await expect(pub.goToFieldButton('Title')).toBeVisible();
        await expect(page.getByRole('button', {name: 'Jump to next error'})).toBeVisible();

        // Restore the (italic) title, clear the Abstract and press Save:
        // "This field is required." appears under Abstract before the save
        // is even sent (no publications write leaves the browser).
        await pub.setRichText(
            'titleAbstract-title-control-en',
            `<i>Submission ${tag}</i>`
        );
        await pub.setRichText('titleAbstract-abstract-control-en', '');
        const sent = await pub.saveRefusedInPlace(pub.goToFieldButton('Abstract'));
        expect(sent).toBe(0);
        await expect(pub.fieldError('This field is required.')).toBeVisible();
        await expect(page.getByText('Please correct one error.')).toBeVisible();

        // Restore the abstract and save again ("Saved" #2).
        await pub.setRichText(
            'titleAbstract-abstract-control-en',
            `<p>Abstract ${tag} revised</p>`
        );
        await pub.save();

        // A reload shows the saved values.
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Title & Abstract');
        await expect(page.locator('input[name="prefix-en"]')).toHaveValue('The');
        expect(await pub.richTextContent('titleAbstract-title-control-en')).toBe(
            `<i>Submission ${tag}</i>`
        );
        expect(await pub.richTextContent('titleAbstract-subtitle-control-en')).toBe(
            `Subtitle ${tag}`
        );
        expect(await pub.richTextContent('titleAbstract-abstract-control-en')).toContain(
            `Abstract ${tag} revised`
        );

        // The Activity Log gained "Submission metadata updated" lines
        // attributed to the saving manager — and, the control that the
        // refused saves wrote nothing: one line per "Saved" (two) and none
        // for either refusal.
        const log = await pub.openActivityLog();
        const updatedRows = log
            .getByRole('row')
            .filter({hasText: 'Submission metadata updated'})
            .filter({hasText: 'Maya Manager'});
        await expect(updatedRows.first()).toBeVisible({timeout: 30_000});
        await expect(updatedRows).toHaveCount(2);
        await log.getByRole('button', {name: 'Close', exact: true}).first().click();

        // The dashboard list renders the title with its new prefix.
        const dash = new EditorialDashboardPage(page, JOURNAL);
        await dash.goto();
        await dash.globalSearch(tag);
        await expect(dash.row(tag)).toContainText(`The Submission ${tag}`, {
            timeout: 30_000,
        });

        // The mailbox: no email has arrived for the submission's Author
        // from the saves. Bounded by a mail this test sends the same way:
        // the manager's "Notify" on the spare's own submission (A8).
        const controlPub = new PublicationScreen(page, JOURNAL);
        await controlPub.gotoWorkflow(control.submissionId);
        await controlPub.openStage('Submission');
        await controlPub.notifyParticipant('Xena Spare', `<p>Control ${tag}</p>`);
        await pkpMail.expectNone({
            to: mailOf(author),
            afterControl: {to: mailOf(spare), subject: NOTIFY_SUBJECT, contains: `Control ${tag}`},
        });
    });

    test('S2: the Metadata page follows the journal\'s metadata setup', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s2', testInfo);
        // The first section carries a word limit of 50, the second does not
        // require abstracts (footnote s2).
        const {manager, author} = await seedJournal(ojsApi, tag, {
            sections: [
                {abbrev: 'ART', title: 'Articles', wordCount: 50},
                {abbrev: 'NOA', title: 'No abstracts', abstractsNotRequired: true},
            ],
        });
        const [{submissionId}, noAbstract] = await Promise.all([
            ojsApi.createSubmission({
                tag: `${tag}s`,
                context: tag,
                submitter: author,
                section: 'ART',
                title: `Submission ${tag}s`,
            }),
            ojsApi.createSubmission({
                tag: `${tag}n`,
                context: tag,
                submitter: author,
                section: 'NOA',
                title: `Submission ${tag}n`,
            }),
        ]);

        const page = await (await asUser(manager)).newPage();
        const pub = new PublicationScreen(page, tag);

        // Control: before the untick the Metadata page shows Keywords
        // (enabled on a fresh journal) with a Save button.
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Metadata');
        await expect(page.locator('#metadata-keywords-control-en')).toBeVisible({
            timeout: 30_000,
        });
        await expect(pub.saveButton()).toBeVisible();

        // Disable every Metadata-page item (a fresh journal enables only
        // Keywords; the others are unticked defensively).
        await openMetadataSettings(page, tag);
        for (const name of [
            'Enable keyword metadata',
            'Enable subject metadata',
            'Enable disciplines metadata',
            'Enable supporting agencies metadata',
            'Enable coverage metadata',
            'Enable rights metadata',
            'Enable source metadata',
            'Enable type metadata',
            'Enable funding statement metadata',
        ]) {
            await page.getByRole('checkbox', {name}).uncheck();
        }
        await saveMetadataSettings(page);

        // With nothing enabled the page carries the empty message and no
        // Save button.
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Metadata');
        await expect(
            page.getByText('No metadata fields are currently enabled.')
        ).toBeVisible({timeout: 30_000});
        await expect(pub.saveButton()).toHaveCount(0);

        // Enable Keywords and Coverage: the page shows exactly those two.
        await openMetadataSettings(page, tag);
        await page.getByRole('checkbox', {name: 'Enable keyword metadata'}).check();
        await page.getByRole('checkbox', {name: 'Enable coverage metadata'}).check();
        await saveMetadataSettings(page);

        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Metadata');
        const keywords = page.locator('#metadata-keywords-control-en');
        await expect(keywords).toBeVisible({timeout: 30_000});
        await expect(page.locator('input[name="coverage-en"]')).toBeVisible();
        await expect(page.locator('#metadata-subjects-control-en')).toHaveCount(0);
        await expect(page.locator('input[name="rights-en"]')).toHaveCount(0);
        await expect(page.locator('input[name="source-en"]')).toHaveCount(0);
        await expect(page.locator('input[name="type-en"]')).toHaveCount(0);
        await expect(page.locator('#metadata-fundingStatement-control-en')).toHaveCount(0);
        await expect(page.locator('input[name="pub-id::publisher-id"]')).toHaveCount(0);
        await expect(page.locator('input[name="articleNumber"]')).toHaveCount(0);

        // Keywords are chips: Enter adds one with its own remove button,
        // the button removes it, and a never-used term is accepted as typed.
        await keywords.click();
        await keywords.pressSequentially('ocean acidification', {delay: 15});
        await keywords.press('Enter');
        const chipRemove = page.getByRole('button', {name: 'Remove ocean acidification'});
        await expect(chipRemove).toBeVisible({timeout: 30_000});
        await chipRemove.click();
        await expect(chipRemove).toHaveCount(0);
        await keywords.click();
        await keywords.pressSequentially('ocean acidification', {delay: 15});
        await keywords.press('Enter');
        await expect(chipRemove).toBeVisible({timeout: 30_000});
        await keywords.pressSequentially(`nova${tag}`, {delay: 15});
        await keywords.press('Enter');
        await expect(
            page.getByRole('button', {name: `Remove nova${tag}`})
        ).toBeVisible({timeout: 30_000});
        await page.locator('input[name="coverage-en"]').fill('Pacific Ocean, 2020');
        await pub.save();

        // Reload: both chips and the coverage value are there.
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Metadata');
        await expect(
            page.getByRole('button', {name: 'Remove ocean acidification'})
        ).toBeVisible({timeout: 30_000});
        await expect(page.getByRole('button', {name: `Remove nova${tag}`})).toBeVisible();
        await expect(page.locator('input[name="coverage-en"]')).toHaveValue(
            'Pacific Ocean, 2020'
        );

        // Disabling Coverage hides the field but keeps the stored value;
        // re-enabling shows it again.
        await openMetadataSettings(page, tag);
        await page.getByRole('checkbox', {name: 'Enable coverage metadata'}).uncheck();
        await saveMetadataSettings(page);
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Metadata');
        await expect(page.locator('#metadata-keywords-control-en')).toBeVisible({
            timeout: 30_000,
        });
        await expect(page.locator('input[name="coverage-en"]')).toHaveCount(0);

        await openMetadataSettings(page, tag);
        await page.getByRole('checkbox', {name: 'Enable coverage metadata'}).check();
        await saveMetadataSettings(page);
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Metadata');
        await expect(page.locator('input[name="coverage-en"]')).toHaveValue(
            'Pacific Ocean, 2020',
            {timeout: 30_000}
        );

        // Plain Language Summary at "Ask" (never "Require", A1), and the
        // Publisher ID for publications plus the Article Number, on the
        // same settings screen. The Publisher ID box reads "Enable for
        // Publications" on this journal (the spec's "Enable for Articles"
        // is T-ojs-1 in the findings file).
        await openMetadataSettings(page, tag);
        await page
            .getByRole('checkbox', {name: 'Enable plain language summary metadata'})
            .check();
        const askSummary = page.getByRole('radio', {
            name: 'Ask the author to provide a plain language summary during submission.',
        });
        await expect(askSummary).toBeVisible({timeout: 30_000});
        await askSummary.check();
        await page.getByRole('checkbox', {name: 'Enable for Publications'}).check();
        await page.getByRole('checkbox', {name: 'Enable article number metadata'}).check();
        await saveMetadataSettings(page);

        // Title & Abstract shows "Plain Language Summary" after Abstract.
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Title & Abstract');
        const summaryLabel = page.getByText('Plain Language Summary', {exact: true});
        await expect(summaryLabel).toBeVisible({timeout: 30_000});
        const labels = await page.locator('.pkpFormFieldLabel').allInnerTexts();
        const labelIndex = (name) =>
            labels.findIndex((text) => text.replace(/\s+/g, ' ').trim().startsWith(name));
        expect(labelIndex('Abstract')).toBeGreaterThan(-1);
        expect(labelIndex('Plain Language Summary')).toBeGreaterThan(labelIndex('Abstract'));

        // Over the word limit: the Abstract shows "Word Count: {n}/50" (the
        // seeded abstract's four words); 51 words turn the counter red, and
        // Save is refused by the server with the limit message; nothing is
        // saved (the seeded abstract is back after a reload).
        await expect(pub.wordLimitLine()).toContainText('Word Count: 4/50');
        await expect(pub.wordLimitErrorIcon()).toHaveCount(0);
        await pub.setRichText(
            'titleAbstract-abstract-control-en',
            `<p>${Array(51).fill('over').join(' ')}</p>`
        );
        await expect(pub.wordLimitLine()).toContainText('Word Count: 51/50', {
            timeout: 30_000,
        });
        await expect(pub.wordLimitErrorIcon()).toBeVisible();
        const refused = await pub.saveRefusedByServer();
        expect(refused.status()).toBe(400);
        await expect(
            pub.fieldError(
                'The abstract is too long. It should be 50 words or less. It is currently 51 words long.'
            )
        ).toBeVisible({timeout: 30_000});
        await expect(page.getByText('Please correct one error.')).toBeVisible();
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Title & Abstract');
        expect(await pub.richTextContent('titleAbstract-abstract-control-en')).toContain(
            'Seeded abstract'
        );

        // The Metadata page also shows "Publisher ID" and "Article Number".
        await pub.openEntry('Metadata');
        await expect(page.getByLabel('Publisher ID', {exact: true})).toBeVisible({
            timeout: 30_000,
        });
        await expect(page.getByLabel('Article Number', {exact: true})).toBeVisible();

        // No abstract required: on the second submission, in the section
        // set to "Do not require abstracts", an empty Abstract saves.
        await pub.gotoWorkflow(noAbstract.submissionId);
        await pub.openEntry('Title & Abstract');
        await expect(page.locator('input[name="prefix-en"]')).toBeVisible({timeout: 30_000});
        await pub.setRichText('titleAbstract-abstract-control-en', '');
        await pub.save();
        await pub.gotoWorkflow(noAbstract.submissionId);
        await pub.openEntry('Title & Abstract');
        expect(await pub.richTextContent('titleAbstract-abstract-control-en')).toBe('');
    });

    test('S3: the Author before and after publication', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(480_000);
        const tag = makeTag('s3', testInfo);
        const [{submissionId}, scheduledSeed] = await Promise.all([
            ojsApi.createSubmission({
                tag,
                context: JOURNAL,
                submitter: 'author.alex',
                title: `Submission ${tag}`,
            }),
            ojsApi.createSubmission({
                tag: `${tag}q`,
                context: JOURNAL,
                submitter: 'author.alex',
                title: `Submission ${tag}q`,
            }),
        ]);
        const scheduledId = scheduledSeed.submissionId;

        const authorPage = await (await asUser('author.alex')).newPage();
        const authorPub = new PublicationScreen(authorPage, JOURNAL);
        const managerPage = await (await asUser('manager.maya')).newPage();
        const managerPub = new PublicationScreen(managerPage, JOURNAL);
        const prefix = authorPage.locator('input[name="prefix-en"]');
        const publishedBanner = authorPage.getByText(
            'This version has been published and can not be edited.'
        );
        const editorWarning = authorPage.getByText('Warning: This version has been published');
        const V1 = 'Version of Record 1.0';
        const V2 = 'Version of Record 1.1';

        // The author view lists "Title & Abstract" and "Metadata" and no
        // "Permissions & Disclosure" (positive control: the sibling entries
        // are offered).
        await authorPub.gotoWorkflow(submissionId, {author: true});
        await expect(authorPub.entryLink('Title & Abstract')).toBeVisible();
        await expect(authorPub.entryLink('Metadata')).toBeVisible();
        await expect(authorPub.entryLink('Permissions & Disclosure')).toHaveCount(0);

        // On a journal the submitting Author's Title & Abstract shows the
        // fields with Save unavailable, and nothing typed persists on reload.
        await authorPub.openEntry('Title & Abstract');
        await expect(prefix).toBeVisible();
        await expect(authorPub.saveButton()).toBeDisabled();
        await prefix.fill('Zzz');
        await authorPub.gotoWorkflow(submissionId, {author: true});
        await authorPub.openEntry('Title & Abstract');
        await expect(prefix).toHaveValue('');

        // An unsaved edit on the read-only page: type "The", open
        // "Metadata" and come back: no prompt appeared (neither a browser
        // dialog nor an in-app one) and Prefix is empty (Rule 10).
        let watch = armDialogWatch(authorPage);
        await prefix.fill('The');
        await expect(prefix).toHaveValue('The');
        await authorPub.openEntry('Metadata');
        await expect(unsavedPrompt(authorPage)).toHaveCount(0);
        expect(watch.dialogs).toEqual([]);
        watch.disarm();
        await authorPub.openEntry('Title & Abstract');
        await expect(prefix).toHaveValue('');

        // The Journal Manager publishes (no issue: continuous publication);
        // the header reads "Status: Published".
        await managerPub.gotoWorkflow(submissionId);
        await managerPub.openEntry('Title & Abstract');
        await managerPub.publish();
        await managerPub.expectStatus('Published');

        // Control: the lock is the Author's. The Journal Manager's Title &
        // Abstract on the published version stays editable, with the
        // warning banner (Rule 8).
        await managerPub.openEntry('Title & Abstract');
        await expect(managerPage.getByText(PUBLISHED_WARNING)).toBeVisible({timeout: 30_000});
        await expect(managerPub.saveButton()).toBeEnabled();

        // The published version tells the Author it cannot be edited.
        await authorPub.gotoWorkflow(submissionId, {author: true});
        await authorPub.openEntry('Title & Abstract');
        await expect(publishedBanner).toBeVisible({timeout: 30_000});
        await expect(authorPub.saveButton()).toBeDisabled();

        // The Journal Manager ticks "Allow this person to make changes to
        // the publication…" on the Author's assignment (a published item's
        // workflow opens on a Publication page, so the stage screen first).
        await managerPub.openStage('Submission');
        await managerPub.allowParticipantMetadataEdit('Alex Author');

        // The published version is still read-only for the Author, with
        // its banner.
        await authorPub.gotoWorkflow(submissionId, {author: true});
        await authorPub.openEntry('Title & Abstract');
        await expect(publishedBanner).toBeVisible({timeout: 30_000});
        await expect(authorPub.saveButton()).toBeDisabled();

        // "Create New Version", confirmed as offered: a published Version
        // of Record 1.0 yields "Version of Record 1.1".
        await managerPub.gotoWorkflow(submissionId);
        await managerPub.createNewVersion({expectLabel: V2});

        // The new version's Title & Abstract shows the Author no banner and
        // offers Save (Rule 9). Rule 10 on the editable page too: "The"
        // typed as Prefix, Metadata opened and the page reopened: no prompt,
        // Prefix empty.
        await authorPub.gotoWorkflow(submissionId, {author: true});
        await authorPub.openVersionEntry(V2, 'Title & Abstract');
        await expect(authorPub.saveButton()).toBeEnabled({timeout: 30_000});
        await expect(publishedBanner).toHaveCount(0);
        await expect(editorWarning).toHaveCount(0);
        watch = armDialogWatch(authorPage);
        await prefix.fill('The');
        await expect(prefix).toHaveValue('The');
        await authorPub.openVersionEntry(V2, 'Metadata');
        await expect(unsavedPrompt(authorPage)).toHaveCount(0);
        expect(watch.dialogs).toEqual([]);
        watch.disarm();
        await authorPub.openVersionEntry(V2, 'Title & Abstract');
        await expect(prefix).toHaveValue('');

        // The Author's save on the new version, pressed while the other
        // version is still published (A16 retired 2026-09-14, header):
        // "The" as Prefix, the footer reads "Saved", and after a reload
        // Prefix reads "The".
        await expect(authorPub.saveButton()).toBeEnabled({timeout: 30_000});
        await prefix.fill('The');
        await authorPub.save();
        await authorPub.gotoWorkflow(submissionId, {author: true});
        await authorPub.openVersionEntry(V2, 'Title & Abstract');
        await expect(prefix).toHaveValue('The', {timeout: 30_000});

        // The other version's own copy: the published version's page still
        // carries the banner and its Prefix is empty (Rules 3, 9) — also the
        // positive control for the absent banner above.
        await authorPub.openVersionEntry(V1, 'Title & Abstract');
        await expect(publishedBanner).toBeVisible({timeout: 30_000});
        await expect(authorPub.saveButton()).toBeDisabled();
        await expect(prefix).toHaveValue('');

        // The Journal Manager unpublishes (from the published version's
        // page). The Author's assignment permission is left as it was: the
        // "Edit Assignment" box reads still ticked, and nothing is re-ticked.
        await managerPub.gotoWorkflow(submissionId);
        await managerPub.openVersionEntry(V1, 'Title & Abstract');
        await managerPub.unpublish();
        await managerPub.openStage('Submission');
        expect(await managerPub.participantMetadataEditAllowed('Alex Author')).toBe(true);

        // After the unpublish the Author saves at once on the other
        // (formerly published) version, with no re-tick: "The" as Prefix;
        // the new version still carries the "The" saved above, and both
        // read "The" after a reload.
        await authorPub.gotoWorkflow(submissionId, {author: true});
        await authorPub.openVersionEntry(V1, 'Title & Abstract');
        await expect(authorPub.saveButton()).toBeEnabled({timeout: 30_000});
        await expect(publishedBanner).toHaveCount(0);
        await expect(prefix).toHaveValue('');
        await prefix.fill('The');
        await authorPub.save();
        await authorPub.openVersionEntry(V2, 'Title & Abstract');
        await expect(authorPub.saveButton()).toBeEnabled({timeout: 30_000});
        await expect(prefix).toHaveValue('The');
        await authorPub.gotoWorkflow(submissionId, {author: true});
        await authorPub.openVersionEntry(V1, 'Title & Abstract');
        await expect(prefix).toHaveValue('The');
        await authorPub.openVersionEntry(V2, 'Title & Abstract');
        await expect(prefix).toHaveValue('The');

        // Journal only: a different submission of the same Author, the
        // permission ticked the same way — the positive control: the Author
        // saves while nothing is scheduled.
        await managerPub.gotoWorkflow(scheduledId);
        await managerPub.allowParticipantMetadataEdit('Alex Author');
        await authorPub.gotoWorkflow(scheduledId, {author: true});
        await authorPub.openEntry('Title & Abstract');
        await expect(authorPub.saveButton()).toBeEnabled({timeout: 30_000});
        await prefix.fill('A');
        await authorPub.save();

        // Schedule it to the seeded future issue through the dependable
        // route (spec seeding note: Publication Settings first, then the
        // panel); the header reads "Status: Scheduled".
        await managerPub.gotoWorkflow(scheduledId);
        await managerPub.scheduleToFutureIssue(/Vol\. 2 No\. 1 \(2015\)/);
        await managerPub.expectStatus('Scheduled');

        // Scheduling fills nothing (Rule 12): the Journal Manager's
        // "Permissions & Disclosure" shows Copyright Holder and Copyright
        // Year still locked with their descriptions and License URL still
        // empty and plain-editable, the seeded journal having no default
        // license (control: the two "Override" links are offered).
        await managerPub.openEntry('Permissions & Disclosure');
        const fields = managerPub.permissionsFields();
        await expect(fields.holder).toBeDisabled({timeout: 30_000});
        await expect(fields.holder).toHaveValue('');
        await expect(fields.holderDescription).toBeVisible();
        await expect(fields.year).toBeDisabled();
        await expect(fields.year).toHaveValue('');
        await expect(fields.yearDescription).toBeVisible();
        await expect(fields.licenseUrl).toBeEnabled();
        await expect(fields.licenseUrl).toHaveValue('');
        await expect(fields.licenseDescription).toHaveCount(0);
        await expect(fields.overrides).toHaveCount(2);

        // The Author's page is read-only with no banner at all (Rule 9);
        // the fields are shown (control for the absent banner text).
        await authorPub.gotoWorkflow(scheduledId, {author: true});
        await authorPub.openEntry('Title & Abstract');
        await expect(prefix).toBeVisible({timeout: 30_000});
        await expect(prefix).toHaveValue('A');
        await expect(authorPub.saveButton()).toBeDisabled();
        await expect(authorPage.getByText('can not be edited')).toHaveCount(0);
        await expect(editorWarning).toHaveCount(0);

        // "Create New Version" is offered on the scheduled item.
        await managerPub.gotoWorkflow(scheduledId);
        await expect(managerPub.createNewVersionLink()).toBeVisible({timeout: 30_000});
        await managerPub.createNewVersion({expectLabel: V2});

        // The permitted Author saves on the new version, while the
        // scheduled one stays read-only with no banner.
        await authorPub.gotoWorkflow(scheduledId, {author: true});
        await authorPub.openVersionEntry(V2, 'Title & Abstract');
        await expect(authorPub.saveButton()).toBeEnabled({timeout: 30_000});
        await expect(authorPage.getByText('can not be edited')).toHaveCount(0);
        await prefix.fill('B');
        await authorPub.save();
        await authorPub.gotoWorkflow(scheduledId, {author: true});
        await authorPub.openVersionEntry(V2, 'Title & Abstract');
        await expect(prefix).toHaveValue('B');
        await authorPub.openVersionEntry(V1, 'Title & Abstract');
        await expect(prefix).toHaveValue('A');
        await expect(authorPub.saveButton()).toBeDisabled();
        await expect(authorPage.getByText('can not be edited')).toHaveCount(0);
        await expect(editorWarning).toHaveCount(0);
    });

    test('S4: a published version warns the editor and stays editable', async ({asUser, ojsApi, page}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        const {submissionId} = await ojsApi.createSubmission({
            tag,
            context: JOURNAL,
            submitter: 'author.alex',
            title: `Submission ${tag}`,
            decisions: ['skipExternalReview', 'sendToProduction'],
            published: true,
        });

        const managerPage = await (await asUser('manager.maya')).newPage();
        const pub = new PublicationScreen(managerPage, JOURNAL);
        const articleUrl = `/index.php/${JOURNAL}/article/view/${submissionId}`;

        // Control: before the save the landing page shows the abstract as
        // submitted (anonymous reader: the bare page fixture holds no
        // session).
        await page.goto(articleUrl);
        await expect(page.getByText(`Seeded abstract for ${tag}.`)).toBeVisible({
            timeout: 30_000,
        });
        await expect(page.getByText(`Abstract ${tag} after publishing`)).toHaveCount(0);

        // The warning banner sits on every Publication page of the
        // published version.
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Title & Abstract');
        await expect(managerPage.getByText(PUBLISHED_WARNING)).toBeVisible({timeout: 30_000});
        await pub.openEntry('Metadata');
        await expect(managerPage.getByText(PUBLISHED_WARNING)).toBeVisible({timeout: 30_000});
        await pub.openEntry('Permissions & Disclosure');
        await expect(managerPage.getByText(PUBLISHED_WARNING)).toBeVisible({timeout: 30_000});

        // The forms stay editable; a save changes what readers see at once.
        // Content-verified edit (the OPS U40 S4 idiom): a late async
        // component refresh can remount the form and revert the editor to
        // the server value after the fill — the save then POSTs the OLD
        // abstract (200 + toast, stale DB). Each bounded attempt redoes
        // fill+save and passes only when the save response's publication
        // JSON holds the new abstract.
        await pub.openEntry('Title & Abstract');
        await expect(async () => {
            await pub.setRichText(
                'titleAbstract-abstract-control-en',
                `<p>Abstract ${tag} after publishing</p>`
            );
            const response = await pub.save();
            const publication = await response.json();
            expect(publication.abstract?.en ?? '').toContain(
                `Abstract ${tag} after publishing`
            );
        }).toPass({intervals: [1_000, 2_000], timeout: 90_000});

        // The reader's page shows the new abstract, the submitted one gone.
        await page.goto(articleUrl);
        await expect(
            page.getByText(`Abstract ${tag} after publishing`)
        ).toBeVisible({timeout: 30_000});
        await expect(page.getByText(`Seeded abstract for ${tag}.`)).toHaveCount(0);
    });

    test('S5: copyright and license — defaults, override, publish', async ({asUser, ojsApi, page}, testInfo) => {
        test.slow();
        test.setTimeout(360_000);
        const tag = makeTag('s5', testInfo);
        const controlTag = `${tag}c`;
        const {manager, author} = await seedJournal(ojsApi, tag);
        const {submissionId} = await ojsApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: author,
            title: `Submission ${tag}s`,
        });

        const managerPage = await (await asUser(manager)).newPage();
        const pub = new PublicationScreen(managerPage, tag);
        const articleUrl = `/index.php/${tag}/article/view/${submissionId}`;
        const block = page.locator('.item.copyright');

        // Journal defaults: holder "Author", CC Attribution 4.0, terms.
        await configureLicenseSettings(managerPage, tag, {
            holder: 'Author',
            license: 'CC Attribution 4.0',
            terms: `<p>License terms ${tag}.</p>`,
        });

        // Permissions & Disclosure arrives locked, each field describing
        // the value the journal will apply, with an Override link.
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Permissions & Disclosure');
        const {holder, year, licenseUrl, overrides} = pub.permissionsFields();
        await expect(holder).toBeDisabled();
        await expect(year).toBeDisabled();
        await expect(licenseUrl).toBeDisabled();
        // The description names the contributor (its exact author-string
        // shape is A11's — asserted only up to the name).
        await expect(
            managerPage.getByText(/Copyright will be assigned automatically to .*Ada/)
        ).toBeVisible();
        await expect(
            managerPage.getByText(
                'The copyright year will be set automatically when this is published in an issue.'
            )
        ).toBeVisible();
        await expect(
            managerPage.getByText(
                'The license will be set automatically to CC Attribution 4.0 when this is published.'
            )
        ).toBeVisible();
        await expect(overrides).toHaveCount(3);

        // Override the holder with a per-item value and save; the field
        // opens unlocked on the next visit.
        await overrides.first().click();
        await expect(holder).toBeEnabled();
        await holder.fill('Example Society');
        await pub.save();
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Permissions & Disclosure');
        await expect(holder).toHaveValue('Example Society', {timeout: 30_000});
        await expect(holder).toBeEnabled();
        await expect(overrides).toHaveCount(2);

        // A refused License URL: Override under License URL, "licence",
        // Save: "This is not a valid URL." under the field with the summary
        // and its jump buttons; nothing is saved — after a reload the field
        // is locked again under its sentence.
        await overrides.last().click();
        await expect(licenseUrl).toBeEnabled();
        await licenseUrl.fill('licence');
        const refused = await pub.saveRefusedByServer();
        expect(refused.status()).toBe(400);
        await expect(pub.fieldError('This is not a valid URL.')).toBeVisible({
            timeout: 30_000,
        });
        await expect(managerPage.getByText('Please correct one error.')).toBeVisible();
        await expect(pub.goToFieldButton('License URL')).toBeVisible();
        await expect(managerPage.getByRole('button', {name: 'Jump to next error'})).toBeVisible();
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Permissions & Disclosure');
        await expect(licenseUrl).toBeDisabled({timeout: 30_000});
        await expect(licenseUrl).toHaveValue('');
        await expect(
            managerPage.getByText(
                'The license will be set automatically to CC Attribution 4.0 when this is published.'
            )
        ).toBeVisible();
        await expect(overrides).toHaveCount(2);

        // Publishing fills the still-empty fields from the defaults and
        // never overwrites the override.
        await pub.publish();
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Permissions & Disclosure');
        const currentYear = String(new Date().getFullYear());
        await expect(holder).toHaveValue('Example Society', {timeout: 30_000});
        await expect(year).toHaveValue(currentYear);
        await expect(licenseUrl).toHaveValue(/creativecommons\.org\/licenses\/by\/4\.0/);
        await expect(holder).toBeEnabled();
        await expect(year).toBeEnabled();
        await expect(licenseUrl).toBeEnabled();
        await expect(overrides).toHaveCount(0);

        // The reader's License block: copyright line, Creative Commons
        // badge sentence, and the journal's License Terms.
        await page.goto(articleUrl);
        await expect(block).toContainText(`Copyright (c) ${currentYear} Example Society`, {
            timeout: 30_000,
        });
        await expect(block).toContainText('This work is licensed under a');
        await expect(block).toContainText(
            'Creative Commons Attribution 4.0 International License'
        );
        await expect(block).toContainText(`License terms ${tag}.`);
        await expect(block.locator('img')).toHaveCount(1);

        // No statement blocks: the same page shows no "Data Availability
        // Statement" and no "Funding Statement" heading, both fields being
        // empty (the License block above is the control).
        await expect(page.locator('.item.dataAvailability')).toHaveCount(0);
        await expect(page.locator('.item.fundingStatement')).toHaveCount(0);
        await expect(page.getByText('Data Availability Statement')).toHaveCount(0);
        await expect(page.getByText('Funding Statement')).toHaveCount(0);

        // Another License URL: the block now shows a link to that address
        // labelled with the copyright statement in place of the badge, the
        // terms below it.
        await licenseUrl.fill('https://example.org/license');
        await pub.save();
        await page.goto(articleUrl);
        const licenseLink = block.locator('a[href="https://example.org/license"]');
        await expect(licenseLink).toHaveText(`Copyright (c) ${currentYear} Example Society`, {
            timeout: 30_000,
        });
        await expect(block.locator('img')).toHaveCount(0);
        await expect(block).not.toContainText('This work is licensed under a');
        await expect(block).toContainText(`License terms ${tag}.`);

        // The override cleared: an emptied Copyright Holder saves; after a
        // reload the field is locked again with its sentence and "Override";
        // the landing page's link now reads "License" and no "Copyright (c)"
        // line shows.
        await holder.fill('');
        await pub.save();
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Permissions & Disclosure');
        await expect(holder).toBeDisabled({timeout: 30_000});
        await expect(holder).toHaveValue('');
        await expect(
            managerPage.getByText(/Copyright will be assigned automatically to .*Ada/)
        ).toBeVisible();
        await expect(overrides).toHaveCount(1);
        await page.goto(articleUrl);
        await expect(licenseLink).toHaveText('License', {timeout: 30_000});
        await expect(block).not.toContainText('Copyright (c)');
        await expect(block).toContainText(`License terms ${tag}.`);

        // Terms without a license: an emptied License URL saves; the
        // landing page's block is the heading and the License Terms
        // paragraph alone: no link, no badge.
        await licenseUrl.fill('');
        await pub.save();
        await page.goto(articleUrl);
        await expect(block).toContainText(`License terms ${tag}.`, {timeout: 30_000});
        await expect(block.getByRole('heading', {name: 'License'})).toBeVisible();
        await expect(block.locator('a')).toHaveCount(0);
        await expect(block.locator('img')).toHaveCount(0);
        await expect(block).not.toContainText('Copyright (c)');

        // The journal without a default license: the published item's
        // Permissions & Disclosure reads Copyright Holder the journal's
        // name, unlocked, no holder having been chosen (Rule 12), and
        // License URL empty and plain-editable, with no description and no
        // "Override" (the first journal's sentence and links are the
        // control).
        const {manager: controlManager, author: controlAuthor} = await seedJournal(
            ojsApi,
            controlTag
        );
        const control = await ojsApi.createSubmission({
            tag: `${controlTag}s`,
            context: controlTag,
            submitter: controlAuthor,
            title: `Submission ${controlTag}s`,
            published: true,
        });
        const controlPage = await (await asUser(controlManager)).newPage();
        const controlPub = new PublicationScreen(controlPage, controlTag);
        await controlPub.gotoWorkflow(control.submissionId);
        await controlPub.openEntry('Permissions & Disclosure');
        const controlFields = controlPub.permissionsFields();
        await expect(controlFields.holder).toHaveValue(`Scratch context ${controlTag}`, {
            timeout: 30_000,
        });
        await expect(controlFields.holder).toBeEnabled();
        await expect(controlFields.licenseUrl).toHaveValue('');
        await expect(controlFields.licenseUrl).toBeEnabled();
        await expect(controlFields.licenseDescription).toHaveCount(0);
        await expect(controlFields.overrides).toHaveCount(0);

        // Control: that item's landing page has no License block, the
        // journal having no default license and no terms.
        await page.goto(`/index.php/${controlTag}/article/view/${control.submissionId}`);
        await expect(
            page.getByRole('heading', {name: `Submission ${controlTag}s`})
        ).toBeVisible({timeout: 30_000});
        await expect(page.locator('.item.copyright')).toHaveCount(0);
    });

    test('S6: change the submission language', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(420_000);
        const tag = makeTag('s6', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag, {bilingual: true});
        const [{submissionId}, published, versioned] = await Promise.all([
            ojsApi.createSubmission({
                tag: `${tag}s`,
                context: tag,
                submitter: author,
                title: `Submission ${tag}s`,
            }),
            ojsApi.createSubmission({
                tag: `${tag}p`,
                context: tag,
                submitter: author,
                title: `Submission ${tag}p`,
                published: true,
            }),
            ojsApi.createSubmission({
                tag: `${tag}v`,
                context: tag,
                submitter: author,
                title: `Submission ${tag}v`,
            }),
        ]);
        const instName = `Institw${tag}`;

        const page = await (await asUser(manager)).newPage();
        await stubRegistrySearch(page);
        const pub = new PublicationScreen(page, tag);
        const contributors = new ContributorsPanel(page);

        // Controls first, on the items that never change language. A
        // published item: the stage screens keep the readout without the
        // button, and no Publication page offers "Change" (the readout's
        // own absence there is A6's question — not asserted). A published
        // item's workflow opens on a Publication page, so the stage check
        // navigates to the Submission stage screen first.
        await pub.gotoWorkflow(published.submissionId);
        await pub.openStage('Submission');
        await expect(page.getByText('Current Submission Language:')).toBeVisible({
            timeout: 30_000,
        });
        await expect(pub.changeLanguageButton()).toHaveCount(0);
        await pub.openEntry('Title & Abstract');
        await expect(pub.saveButton()).toBeVisible({timeout: 30_000});
        await expect(pub.changeLanguageButton()).toHaveCount(0);

        // A second version removes "Change" too (positive control: the
        // single-version item offers it before the version is created).
        await pub.gotoWorkflow(versioned.submissionId);
        await pub.openEntry('Title & Abstract');
        await expect(pub.changeLanguageButton()).toBeVisible({timeout: 30_000});
        await pub.createNewVersion({
            versionStage: 'VoR',
            versionIsMinor: 'false',
            expectLabel: 'Version of Record 1.0',
        });
        await pub.gotoWorkflow(versioned.submissionId);
        await pub.openVersionEntry('Version of Record 1.0', 'Title & Abstract');
        await expect(pub.saveButton()).toBeVisible({timeout: 30_000});
        await expect(pub.changeLanguageButton()).toHaveCount(0);

        // Control: the Author never gets the button: their stage screen
        // shows the readout, their Publication pages neither readout nor
        // button.
        const authorPage = await (await asUser(author)).newPage();
        const authorPub = new PublicationScreen(authorPage, tag);
        await authorPub.gotoWorkflow(submissionId, {author: true});
        await expect(authorPage.getByText('Current Submission Language:')).toBeVisible({
            timeout: 30_000,
        });
        await expect(authorPub.changeLanguageButton()).toHaveCount(0);
        await authorPub.openEntry('Title & Abstract');
        await expect(authorPage.locator('input[name="prefix-en"]')).toBeVisible({
            timeout: 30_000,
        });
        await expect(authorPage.getByText('Current Submission Language:')).toHaveCount(0);
        await expect(authorPub.changeLanguageButton()).toHaveCount(0);

        // An affiliation typed on the contributor before the change (the
        // seeded contributor has none), so the copy below has something to
        // copy: it reads "1 of 2 languages completed" while only English
        // is filled (the control of the copy).
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Contributors');
        let contributorPanel = await contributors.openEdit('Ada Author');
        await contributors.typeAndPickTypedInstitution(contributorPanel, instName);
        await expect(contributors.affiliationAddButton(contributorPanel)).toBeEnabled({
            timeout: 30_000,
        });
        await contributors.affiliationAddButton(contributorPanel).click();
        await contributors.fillPerson(contributorPanel, {country: 'Canada'});
        await expect(contributors.affiliationRow(contributorPanel, instName)).toContainText(
            '1 of 2 languages completed',
            {timeout: 30_000}
        );
        await contributors.savePanel(contributorPanel);

        // Stage screens show the readout without the button; Publication
        // pages add "Change".
        await pub.gotoWorkflow(submissionId);
        await pub.openStage('Submission');
        await expect(page.getByText('Current Submission Language:')).toBeVisible({
            timeout: 30_000,
        });
        await expect(pub.changeLanguageButton()).toHaveCount(0);
        await pub.openEntry('Title & Abstract');
        await expect(pub.languageReadoutLine()).toContainText('English');
        await expect(pub.readoutChangeButton()).toBeVisible();

        // The panel offers both languages; Cancel changes nothing.
        let dialog = await pub.openChangeLanguagePanel(`Submission ${tag}s`);
        await expect(dialog.getByRole('radio', {name: 'English'})).toBeChecked();
        await expect(dialog.getByRole('radio', {name: 'French (Canada)'})).toBeVisible();
        await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(dialog).toHaveCount(0, {timeout: 30_000});
        await expect(pub.languageReadoutLine()).toContainText('English');

        // Picking the other language reveals the integrity warning with a
        // required Title and — the section requires abstracts — an Abstract
        // box; an empty Abstract refuses the Confirm in place.
        dialog = await pub.openChangeLanguagePanel(`Submission ${tag}s`);
        await dialog.getByRole('radio', {name: 'French (Canada)'}).check();
        await expect(
            dialog.getByText(
                'Before changing the submission language, ensure you have filled out the following metadata fields'
            )
        ).toBeVisible({timeout: 30_000});
        // The revealed boxes settle on the picked language once the panel's
        // per-locale form data lands — gate on the French description.
        await expect(
            dialog.getByText('Enter submission title here in French (Canada)')
        ).toBeVisible({timeout: 30_000});
        await pub.setRichText('changeSubmissionLanguageMetadata-title-control', `Titre ${tag}`);
        await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
        await expect(dialog.getByText('This field is required.').first()).toBeVisible({
            timeout: 30_000,
        });
        await expect(dialog.getByRole('button', {name: 'Confirm', exact: true})).toBeVisible();

        // Filling the abstract lets Confirm through; the screen reloads on
        // Title & Abstract in the new language.
        await pub.setRichText(
            'changeSubmissionLanguageMetadata-abstract-control',
            `<p>Resume ${tag}</p>`
        );
        const changed = page.waitForResponse(
            (r) => r.url().includes('/changeLocale') && r.ok(),
            {timeout: 30_000}
        );
        await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
        await changed;
        await expect(
            page.getByRole('heading', {name: 'Publication: Title & Abstract'})
        ).toBeVisible({timeout: 60_000});
        await expect(pub.languageReadoutLine()).toContainText('French (Canada)', {
            timeout: 30_000,
        });
        expect(await pub.richTextContent('titleAbstract-title-control-fr_CA')).toBe(
            `Titre ${tag}`
        );

        // The old language's title sits behind the form's language bar.
        await page
            .locator('.pkpFormLocales')
            .getByRole('button', {name: 'English'})
            .click();
        await expect(page.getByText('2/2 languages completed').first()).toBeVisible({
            timeout: 30_000,
        });
        expect(await pub.richTextContent('titleAbstract-title-control-en')).toBe(
            `Submission ${tag}s`
        );

        // The contributor's names and the affiliation were copied into the
        // new language: the "Edit" form shows the French given name and the
        // institution's French name box holding the English name.
        await pub.openEntry('Contributors');
        contributorPanel = await contributors.openEdit('Ada Author');
        await expect(
            contributorPanel.locator('input[name="givenName-fr_CA"]')
        ).toHaveValue('Ada', {timeout: 30_000});
        await expect(contributorPanel.locator('input[name="familyName-fr_CA"]')).toHaveValue(
            'Author'
        );
        await expect(contributors.affiliationRow(contributorPanel, instName)).toBeVisible({
            timeout: 30_000,
        });
        await expect(contributors.affiliationRow(contributorPanel, instName)).toContainText(
            'All translations available'
        );
        await contributors.openAffiliationAction(contributorPanel, instName, 'Edit institution name');
        const nameBoxes = contributors
            .affiliationRow(contributorPanel, instName)
            .locator('input[name="name"]');
        await expect(nameBoxes).toHaveCount(2, {timeout: 30_000});
        await expect(nameBoxes.first()).toHaveValue(instName);
        await expect(nameBoxes.nth(1)).toHaveValue(instName);
    });

    test('S7: reset every article\'s permissions', async ({asUser, ojsApi, page, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s7', testInfo);
        const {manager, author, spare} = await seedJournal(ojsApi, tag, {spare: true});

        const managerPage = await (await asUser(manager)).newPage();
        const pub = new PublicationScreen(managerPage, tag);

        // Journal defaults: a CC license and terms; no holder chosen, so
        // the default holder is the journal's name (keeps A11 out).
        await configureLicenseSettings(managerPage, tag, {
            license: 'CC Attribution 4.0',
            terms: `<p>License terms ${tag}.</p>`,
        });

        // A published item (fields filled at publish) whose holder is then
        // overridden per-item, and an unpublished submission of the same
        // Author with the spare account assigned beside her (the Notify
        // controls' recipient).
        const [{submissionId}, unpublished] = await Promise.all([
            ojsApi.createSubmission({
                tag: `${tag}s`,
                context: tag,
                submitter: author,
                title: `Submission ${tag}s`,
                published: true,
            }),
            ojsApi.createSubmission({
                tag: `${tag}u`,
                context: tag,
                submitter: author,
                title: `Submission ${tag}u`,
                participants: [{username: spare, role: 'author'}],
            }),
        ]);
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Permissions & Disclosure');
        const holder = managerPage.locator('input[name="copyrightHolder-en"]');
        await expect(holder).toBeEnabled({timeout: 30_000});
        await holder.fill('Example Society');
        await pub.save();
        const currentYear = String(new Date().getFullYear());
        await page.goto(`/index.php/${tag}/article/view/${submissionId}`);
        await expect(page.locator('.item.copyright')).toContainText(
            `Copyright (c) ${currentYear} Example Society`,
            {timeout: 30_000}
        );

        // The Author's Tasks window before the reset (the rows the seeds
        // left her, read the same way as after it).
        const authorPage = await (await asUser(author)).newPage();
        const tasks = new TasksPanel(authorPage);
        await authorPage.goto(`/index.php/${tag}/dashboard/mySubmissions`);
        await expect(tasks.bell()).toBeVisible({timeout: 30_000});
        await tasks.open();
        const rowsBefore = await tasks.rowTexts();
        await tasks.close();

        // Control: before OK the unpublished submission's Copyright Holder
        // and Copyright Year are locked and empty (the published item's
        // holder reads "Example Society", read again below before the OK).
        const unpublishedPub = new PublicationScreen(managerPage, tag);
        await unpublishedPub.gotoWorkflow(unpublished.submissionId);
        await unpublishedPub.openEntry('Permissions & Disclosure');
        const unpublishedFields = unpublishedPub.permissionsFields();
        await expect(unpublishedFields.holder).toBeDisabled({timeout: 30_000});
        await expect(unpublishedFields.holder).toHaveValue('');
        await expect(unpublishedFields.year).toBeDisabled();
        await expect(unpublishedFields.year).toHaveValue('');
        await expect(unpublishedFields.overrides).toHaveCount(3);

        // Tools › Permissions. Cancelling the browser's confirm box resets
        // nothing (the button staying greyed afterwards is A13's — the test
        // reloads instead of asserting it).
        await openPermissionsTools(managerPage, tag);
        const confirmText =
            'Are you sure you wish to reset permissions data for all articles? This action can not be undone.';
        let confirmMessage = '';
        managerPage.once('dialog', async (dialog) => {
            confirmMessage = dialog.message();
            await dialog.dismiss();
        });
        await managerPage
            .getByRole('button', {name: 'Reset Article Permissions'})
            .click();
        await expect.poll(() => confirmMessage, {timeout: 30_000}).toBe(confirmText);
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Permissions & Disclosure');
        await expect(holder).toHaveValue('Example Society', {timeout: 30_000});

        // OK resets: the toast appears, the override is gone in favor of
        // the journal's default holder, and the reader's line follows.
        await resetPermissions(managerPage, tag);

        const journalName = `Scratch context ${tag}`;
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Permissions & Disclosure');
        await expect(holder).toHaveValue(journalName, {timeout: 30_000});
        await page.goto(`/index.php/${tag}/article/view/${submissionId}`);
        await expect(page.locator('.item.copyright')).toContainText(
            `Copyright (c) ${currentYear} ${journalName}`,
            {timeout: 30_000}
        );

        // Nobody else is told: no email has arrived for the unpublished
        // submission's Author from the reset — bounded by a mail this test
        // sends the same way, the manager's "Notify" on the spare
        // participant of that submission (A8).
        await unpublishedPub.gotoWorkflow(unpublished.submissionId);
        await unpublishedPub.openStage('Submission');
        await unpublishedPub.notifyParticipant('Xena Spare', `<p>Control ${tag}</p>`);
        await pkpMail.expectNone({
            to: mailOf(author),
            afterControl: {to: mailOf(spare), subject: NOTIFY_SUBJECT, contains: `Control ${tag}`},
        });

        // …and the Author, signed in, finds no notification of it: her
        // Tasks window holds the rows it held before the reset plus the
        // discussion the manager now starts with her (the control that the
        // window shows what reaches her) and nothing about permissions.
        await unpublishedPub.notifyParticipant('Ada Author', `<p>Author control ${tag}</p>`);
        await authorPage.goto(`/index.php/${tag}/dashboard/mySubmissions`);
        await expect(tasks.bell()).toBeVisible({timeout: 30_000});
        await tasks.open();
        await expect(tasks.row(`Author control ${tag}`)).toHaveCount(1, {timeout: 30_000});
        await expect(tasks.rowsOpening(/permission|reset/i)).toHaveCount(0);
        const rowsAfter = await tasks.rowTexts();
        // Compared sorted: the window orders by creation time to the second,
        // and the seeds raised several of her tasks in one second (fix list B).
        expect(rowsAfter.filter((row) => !row.includes(`Author control ${tag}`)).sort()).toEqual([...rowsBefore].sort());
    });

    test('S8: statements reach the reader', async ({asUser, ojsApi, page}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s8', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag);
        const {submissionId} = await ojsApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: author,
            title: `Submission ${tag}s`,
            published: true,
        });

        const managerPage = await (await asUser(manager)).newPage();
        const pub = new PublicationScreen(managerPage, tag);
        const articleUrl = `/index.php/${tag}/article/view/${submissionId}`;

        // Control: with both fields empty the published page shows neither
        // block and neither heading (the title heading is the control).
        await page.goto(articleUrl);
        await expect(
            page.getByRole('heading', {name: `Submission ${tag}s`})
        ).toBeVisible({timeout: 30_000});
        await expect(page.locator('.item.dataAvailability')).toHaveCount(0);
        await expect(page.locator('.item.fundingStatement')).toHaveCount(0);
        await expect(page.getByText('Data Availability Statement')).toHaveCount(0);
        await expect(page.getByText('Funding Statement')).toHaveCount(0);

        // Enable both statements; the Publication area gains a "Data" entry
        // (after References, before Funding).
        await openMetadataSettings(managerPage, tag);
        await managerPage
            .getByRole('checkbox', {name: 'Enable data availability statement metadata'})
            .check();
        await managerPage
            .getByRole('checkbox', {name: 'Enable funding statement metadata'})
            .check();
        await saveMetadataSettings(managerPage);

        await pub.gotoWorkflow(submissionId);
        await expect(pub.entryLink('Data')).toBeVisible({timeout: 30_000});
        const navNames = await managerPage.getByRole('link').allInnerTexts();
        expect(navNames.indexOf('References')).toBeLessThan(navNames.indexOf('Data'));
        expect(navNames.indexOf('Data')).toBeLessThan(navNames.indexOf('Funding'));

        // Fill both statements (the published version stays editable).
        await pub.openEntry('Data');
        await expect(
            managerPage.getByText('Data Availability Statement', {exact: true})
        ).toBeVisible({timeout: 30_000});
        await pub.setRichText(
            'dataAvailability-dataAvailability-control-en',
            `<p>Data statement ${tag}.</p>`
        );
        await pub.save();
        await pub.openEntry('Metadata');
        await pub.setRichText(
            'metadata-fundingStatement-control-en',
            `<p>Funding statement ${tag}.</p>`
        );
        await pub.save();

        // The landing page shows both blocks with the texts, Data
        // Availability Statement first, Funding Statement after it — in
        // that order.
        await page.goto(articleUrl);
        const dataBlock = page.locator('.item.dataAvailability');
        const fundingBlock = page.locator('.item.fundingStatement');
        await expect(dataBlock).toContainText(`Data statement ${tag}.`, {timeout: 30_000});
        await expect(dataBlock).toContainText('Data Availability Statement');
        await expect(fundingBlock).toContainText(`Funding statement ${tag}.`);
        await expect(fundingBlock).toContainText('Funding Statement');
        const blocks = page.locator('.item.dataAvailability, .item.fundingStatement');
        await expect(blocks).toHaveCount(2);
        await expect(blocks.first()).toContainText('Data Availability Statement');
        await expect(blocks.last()).toContainText('Funding Statement');
        const dataBox = await dataBlock.boundingBox();
        const fundingBox = await fundingBlock.boundingBox();
        expect(dataBox && fundingBox && dataBox.y < fundingBox.y).toBe(true);

        // Disabling the statement removes the "Data" entry (data citations
        // are off on a fresh journal) while readers keep the statement.
        await openMetadataSettings(managerPage, tag);
        await managerPage
            .getByRole('checkbox', {name: 'Enable data availability statement metadata'})
            .uncheck();
        await saveMetadataSettings(managerPage);
        await pub.gotoWorkflow(submissionId);
        await expect(pub.entryLink('Title & Abstract')).toBeVisible({timeout: 30_000});
        await expect(pub.entryLink('Data')).toHaveCount(0);
        await page.goto(articleUrl);
        await expect(page.locator('.item.dataAvailability')).toContainText(
            `Data statement ${tag}.`,
            {timeout: 30_000}
        );
    });

    test('S9: copyright year from the issue\'s publication date', async ({asUser, ojsApi, page}, testInfo) => {
        test.slow();
        test.setTimeout(420_000);
        const tag = makeTag('s9', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag);
        const seed = (suffix) =>
            ojsApi.createSubmission({
                tag: `${tag}${suffix}`,
                context: tag,
                submitter: author,
                title: `Submission ${tag}${suffix}`,
            });
        const [{submissionId}, second, third] = await Promise.all([seed('s'), seed('f'), seed('u')]);

        const managerPage = await (await asUser(manager)).newPage();
        const pub = new PublicationScreen(managerPage, tag);
        const currentYear = String(new Date().getFullYear());

        // A default license so the reader's page carries a copyright line;
        // a fresh journal already uses the issue's publication date as the
        // Copyright Year basis.
        await configureLicenseSettings(managerPage, tag, {
            license: 'CC Attribution 4.0',
        });

        // A back issue published last year: create it, publish it, then set
        // its date (the spec's seeding note: publishing an issue stamps
        // today, so the date is set afterwards). Then a future issue with
        // no publication date yet, created and left unpublished (the
        // context scenario carries no `issues[]`, so the Issues screen
        // creates it, as it does the back issue).
        await createIssue(managerPage, tag, {
            volume: '2',
            number: '1',
            year: '2025',
            title: 'Back issue 2025',
        });
        await publishIssue(managerPage, 'Vol. 2 No. 1 (2025)');
        await setBackIssueDate(managerPage, 'Vol. 2 No. 1 (2025)', {
            year: '2025',
            monthIndex: '5',
            day: '15',
        });
        await managerPage.goto(`/index.php/${tag}/issue/current`);
        await expect(managerPage.getByText('Published: 2025-06-15')).toBeVisible({
            timeout: 30_000,
        });
        await createIssue(managerPage, tag, {
            volume: '3',
            number: '1',
            year: currentYear,
            title: 'Future issue',
        });

        // Control: before the publish the first submission's Copyright Year
        // is locked with the description naming the issue's publication
        // date as its basis.
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Permissions & Disclosure');
        const fields = pub.permissionsFields();
        await expect(fields.year).toBeDisabled({timeout: 30_000});
        await expect(fields.year).toHaveValue('');
        await expect(fields.yearDescription).toBeVisible();

        // The dated issue: publish the article into the back issue.
        await pub.openEntry('Title & Abstract');
        await pub.publish({backIssueLabel: /Vol\. 2 No\. 1 \(2025\)/});

        // Copyright Year is the issue's year, not this year, and the
        // reader's line agrees.
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Permissions & Disclosure');
        await expect(fields.year).toHaveValue('2025', {timeout: 30_000});
        await expect(fields.year).toBeEnabled();
        await page.goto(`/index.php/${tag}/article/view/${submissionId}`);
        await expect(page.locator('.item.copyright')).toContainText(
            'Copyright (c) 2025',
            {timeout: 30_000}
        );

        // The issue without a date: the second submission published into
        // the future issue ("Assign To Future Issue and Publish
        // Immediately") gets the current year, the year of publishing.
        const secondPub = new PublicationScreen(managerPage, tag);
        await secondPub.gotoWorkflow(second.submissionId);
        await secondPub.openEntry('Title & Abstract');
        await secondPub.publish({futureIssueLabel: /Vol\. 3 No\. 1 \(\d{4}\)/});
        await secondPub.expectStatus('Published');
        await secondPub.gotoWorkflow(second.submissionId);
        await secondPub.openEntry('Permissions & Disclosure');
        await expect(fields.year).toHaveValue(currentYear, {timeout: 30_000});

        // The reset on the issue basis: the first article's Copyright Year
        // still reads the issue's year, and the third, unpublished
        // submission's reads the current year, unlocked.
        await resetPermissions(managerPage, tag);
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Permissions & Disclosure');
        await expect(fields.year).toHaveValue('2025', {timeout: 30_000});
        const thirdPub = new PublicationScreen(managerPage, tag);
        await thirdPub.gotoWorkflow(third.submissionId);
        await thirdPub.openEntry('Permissions & Disclosure');
        await expect(fields.year).toHaveValue(currentYear, {timeout: 30_000});
        await expect(fields.year).toBeEnabled();
    });

    test('S12: an assistant saves only with the permission', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s12', testInfo);
        // The Copyeditor's stage is Copyediting: the scratch submission is
        // walked there and the Copyeditor assigned with the role's default
        // (footnote s12).
        const {submissionId} = await ojsApi.createSubmission({
            tag,
            context: JOURNAL,
            submitter: 'author.alex',
            title: `Submission ${tag}`,
            decisions: ['accept'],
            participants: [{username: 'copyeditor.carla', role: 'copyeditor'}],
        });

        const managerPage = await (await asUser('manager.maya')).newPage();
        const managerPub = new PublicationScreen(managerPage, JOURNAL);
        const copyeditorPage = await (await asUser('copyeditor.carla')).newPage();
        const copyeditorPub = new PublicationScreen(copyeditorPage, JOURNAL);
        const prefix = copyeditorPage.locator('input[name="prefix-en"]');

        // The assignment's box: on the Copyediting stage's Participants
        // panel the Copyeditor's "Edit Assignment" arrives unticked (read
        // and left as it is).
        await managerPub.gotoWorkflow(submissionId);
        await managerPub.openStage('Copyediting');
        expect(await managerPub.participantMetadataEditAllowed('Carla Copyeditor')).toBe(false);

        // Control, the first read: the Journal Manager, who holds no
        // assignment on the submission, sees "Change" beside the readout.
        await managerPub.openEntry('Title & Abstract');
        await expect(managerPub.languageReadoutLine()).toContainText('English', {
            timeout: 30_000,
        });
        await expect(managerPub.readoutChangeButton()).toBeVisible();

        // The pages without the permission: the Copyeditor's Title &
        // Abstract has Save present but disabled while the fields still
        // look editable; "The" typed as Prefix is gone after a reload; the
        // readout names the language with no "Change" after it.
        await copyeditorPub.gotoWorkflow(submissionId);
        await copyeditorPub.openEntry('Title & Abstract');
        await expect(copyeditorPub.saveButton()).toHaveCount(1, {timeout: 30_000});
        await expect(copyeditorPub.saveButton()).toBeDisabled();
        await expect(prefix).toBeEnabled();
        await expect(copyeditorPub.languageReadoutLine()).toContainText('English');
        await expect(copyeditorPub.readoutChangeButton()).toHaveCount(0);
        await prefix.fill('The');
        await expect(prefix).toHaveValue('The');
        await copyeditorPub.gotoWorkflow(submissionId);
        await copyeditorPub.openEntry('Title & Abstract');
        await expect(prefix).toHaveValue('');
        await expect(copyeditorPub.saveButton()).toBeDisabled();

        // The permission granted: the Journal Manager ticks the box and
        // presses OK.
        await managerPub.openStage('Copyediting');
        await managerPub.allowParticipantMetadataEdit('Carla Copyeditor');
        expect(await managerPub.participantMetadataEditAllowed('Carla Copyeditor')).toBe(true);

        // The pages with the permission: Save is offered; "The" as Prefix
        // saves with "Saved" and reads "The" after a reload; "Change" now
        // follows the readout.
        await copyeditorPub.gotoWorkflow(submissionId);
        await copyeditorPub.openEntry('Title & Abstract');
        await expect(copyeditorPub.saveButton()).toBeEnabled({timeout: 30_000});
        await expect(copyeditorPub.languageReadoutLine()).toContainText('English');
        await expect(copyeditorPub.readoutChangeButton()).toBeVisible();
        await prefix.fill('The');
        await copyeditorPub.save();
        await copyeditorPub.gotoWorkflow(submissionId);
        await copyeditorPub.openEntry('Title & Abstract');
        await expect(prefix).toHaveValue('The', {timeout: 30_000});
        await expect(copyeditorPub.readoutChangeButton()).toBeVisible();

        // Control: the Journal Manager saves on the same page with "Saved"
        // and still sees "Change" beside the readout.
        await managerPub.gotoWorkflow(submissionId);
        await managerPub.openEntry('Title & Abstract');
        await expect(managerPub.readoutChangeButton()).toBeVisible({timeout: 30_000});
        await managerPub.setRichText('titleAbstract-subtitle-control-en', `Subtitle ${tag}`);
        await managerPub.save();
        await expect(managerPub.readoutChangeButton()).toBeVisible();
        await managerPub.gotoWorkflow(submissionId);
        await managerPub.openEntry('Title & Abstract');
        expect(await managerPub.richTextContent('titleAbstract-subtitle-control-en')).toBe(
            `Subtitle ${tag}`
        );
        await expect(managerPage.locator('input[name="prefix-en"]')).toHaveValue('The');
    });
});
