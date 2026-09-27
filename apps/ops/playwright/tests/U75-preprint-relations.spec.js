// @ts-check
/**
 * @file playwright/tests/U75-preprint-relations.spec.js
 *
 * Preprint relations — OPS suite, one test per canonical scenario the spec
 * runs on a preprint server (S1–S6; S7 is the journal's and the press's
 * absence, in the OJS and OMP trees), in the preprint server's own words:
 * the Author, the Preprint Server Manager, the Moderator, a preprint, the
 * "Preprint" group whose pages are headed "Preprint: …", "Post" and the
 * "Post the preprint" window, and the preprint page `preprint/view/{id}`.
 * Spec: docs/specs/U75-preprint-relations.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A2 🐞: S3's refused save is read as refused (its answer not OK, no
 *   "Saved") and as writing nothing; the active "Save" and the
 *   unexpected-error notice are not asserted.
 * - A4 ❓: S4 types a DOI on its own and reads the refusal the scenario
 *   states; which values should be accepted is not asserted beyond it.
 * - A9 🐞: no test reads the Review step's line for a question never
 *   answered.
 * - A1, A3, A5, A6, A7, A8, A10, A11: no scenario step here (S5 reaches
 *   "For Readers" through the step rail, never a reload or the panel's
 *   "Edit").
 *
 * Seeding: scenario endpoints only (footnote s0). S1 and S3–S6 run on the
 * seeded server `publicknowledge` on their own preprints (submitter
 * `author.alex`; `manager.maya`; the Moderator `sectioneditor.omar` through
 * `participants[]`, with `canChangeMetadata: false` on S3's second
 * preprint: footnote s0 names `sectioneditor.ana`, but she moderates the
 * server's one section, is assigned to every preprint on its submit with
 * the permission, and the seed then keeps that row (T-ops-1); Omar
 * moderates no section there), which the roster reads and never changes.
 * A seeded preprint already carries "Submission metadata updated" lines
 * under its submitter's name, so the Activity Log is read as one line
 * more under the saver's name than before the save. S2 runs on a scratch
 * preprint server with throwaway accounts (the username twice as password):
 * `doiPrefix`, the Crossref plugin with its depositor settings and
 * `registrationAgency: 'crossrefplugin'`; its posted preprint's DOI is
 * marked "Registered" on the DOIs page (Bulk Actions › "Mark DOIs
 * Registered") before the scenario's own steps. No key seeds a relation
 * and a seeded preprint holds no status at all (seed-facts): S6's starting
 * relation is saved through "Relations" before the scenario starts. S2's
 * mailbox silence is bounded by a discussion the manager opens with a
 * spare account of its own server (A8). Signed-out reads run in a browser
 * context with an empty storage state (patterns.md, parallel lesson 8);
 * every actor has its own `asUser` context and the file sets no default
 * user. Nothing site-wide changes, so the suite runs in the parallel `ops`
 * project.
 */
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {ActivityLogWindow} = require('../../../../shared/playwright/pages/ActivityLogPages.js');
const {DoisPage} = require('../../../../shared/playwright/pages/DoisPages.js');
const {ArticleLandingPage, LANDING_TEXT} = require('../../../../shared/playwright/pages/ArticleLandingPages.js');
const {
    RELATIONS_TEXT: TEXT,
    RELATION_CHOICES,
    RelationsControl,
    PostWindow,
    reviewRelationLine,
    relationNotice,
    pressPreview,
    lines,
} = require('../../../../shared/playwright/pages/PreprintRelationsPages.js');
const {openWorkflow, PublicationScreen, addDiscussion, createNewVersion, expectPrecedes} = require('../pages/PublicationPages.js');
const {wizardUrl, expectStep, continueTo, gotoStep, openReview, STEPS} = require('../pages/SubmissionWizardPages.js');

const SERVER = 'publicknowledge';
const MANAGER = 'manager.maya';
const AUTHOR = 'author.alex';
const MODERATOR = 'sectioneditor.omar';
const METADATA_EVENT = 'Submission metadata updated';
const MODERATOR_NAME = 'Omar Section Editor';
const DEPOSITOR = {depositorName: 'Public Knowledge Project', depositorEmail: 'doi@mail.test'};
const DOI_ABCD = 'https://doi.org/10.1234/abcd';
const DOI_ELSEWHERE = 'https://doi.org/10.1234/elsewhere';
const DOI_MODERATED = 'https://doi.org/10.1234/moderated';
const DOI_REFUSED = 'https://doi.org/10.1234/refused';
const OTHER_ADDRESS = 'http://example.org/x';
const BARE_DOI = '10.1234/abcd';
const OUTDATED = /^\s*This is an outdated version published on .+\. Read the most recent version\.\s*$/;

/** The open panel's lines: nothing but the form (legend, choices, the box's label, "Save"). */
const PANEL_WITH_BOX = [TEXT.legend, ...RELATION_CHOICES, TEXT.doiLabel, TEXT.save];

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u75${scenario}opw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: mailOf(username), roles};
}

/**
 * A page as `username` with the workflow frame of `contextPath` (the
 * "Preprint" group), the "Relations" control and the "Post" window.
 */
async function pageAs(asUser, appContext, username, contextPath) {
    const page = await (await asUser(username)).newPage();
    const frame = new WorkflowPage(page, contextPath, {appContext, labels: {publicationGroup: 'Preprint'}});
    return {page, frame, relations: new RelationsControl(page, frame), post: new PostWindow(page, frame)};
}

/** A signed-out visitor's page (an explicit empty state, patterns.md lesson 8). */
async function visitorPage(browser, baseURL) {
    const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
    return context.newPage();
}

/** The preprint page object of `contextPath` (`locale` "en" on the bilingual seeded server). */
function preprintPage(page, contextPath, locale) {
    return new ArticleLandingPage(page, contextPath, {op: 'preprint', locale});
}

/** Open one version's "Title & Abstract" by its address, settled on the version. */
async function openTitleAbstract(frame, submissionId, publicationId) {
    await frame.gotoEditorial(submissionId, {menuKey: `publication_${publicationId}_titleAbstract`});
    await frame.expectPageHeading('Title & Abstract');
    await frame.expectVersionLoaded();
}

/**
 * The relation notice reads `expected` line by line, and is the page's
 * only notice after `before` (the notices ahead of it); it stands above
 * the "Preprint" label line, which stands above the title (Rule 8).
 */
async function expectRelationNotice(landing, expectedLines, before = []) {
    const notices = landing.notices();
    await expect(notices).toHaveCount(before.length + 1);
    for (const [i, text] of before.entries()) {
        await expect(notices.nth(i)).toHaveText(text);
    }
    const notice = relationNotice(notices);
    await expect(notices.nth(before.length)).toContainText(TEXT.published);
    await expect.poll(() => lines(notice)).toEqual(expectedLines);
    await expectPrecedes(notice, landing.labelLineParts().first());
    await expectPrecedes(landing.labelLineParts().first(), landing.title());
    return notice;
}

/**
 * The Activity Log's "Submission metadata updated" lines under `name`,
 * counted and the window closed again. A seeded preprint already carries
 * such lines under its submitter's name, so a claim is read as one line
 * more than before the save.
 */
async function metadataLinesBy(page, frame, name) {
    const log = new ActivityLogWindow(page, frame);
    await log.open();
    const read = await log.historyLines();
    await log.close();
    return read.filter((line) => line.event === METADATA_EVENT && line.user === name).length;
}

test.describe('preprint relations', () => {
    test('S1: an Author records that their preprint has been published elsewhere', {tag: '@smoke'}, async ({asUser, opsApi, appContext}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s1', testInfo);
        const submission = await opsApi.createSubmission({tag, context: SERVER, submitter: AUTHOR, title: `Relations ${tag}`});
        const author = await pageAs(asUser, appContext, AUTHOR, SERVER);
        const manager = await pageAs(asUser, appContext, MANAGER, SERVER);
        await manager.frame.gotoEditorial(submission.submissionId);
        await manager.frame.expectVersionLoaded();
        const logBefore = await metadataLinesBy(manager.page, manager.frame, 'Alex Author');

        // "Relations": from My Submissions, "Title & Abstract" under the
        // version; the "Status: …" line, then "Relations" with a down arrow;
        // its panel: "Relation status", the three choices in order, none
        // ticked, and "Save" (Fields; Rules 2a, 4).
        await openWorkflow(author.page, SERVER, submission.submissionId, {author: true});
        await author.frame.selectPage('Title & Abstract');
        await expect(author.frame.publicationStatusLine()).toBeVisible();
        await expect(author.relations.button()).toBeVisible();
        await expectPrecedes(author.frame.publicationStatusLine(), author.relations.button());
        await expect(author.relations.buttonArrow()).toHaveCount(1);
        await author.relations.open();
        await expect(author.relations.choiceLabels()).toHaveText(RELATION_CHOICES);
        await author.relations.expectNoneTicked();
        await expect(author.relations.saveButton()).toBeVisible();

        // The DOI box: none with "not published elsewhere"; with "published
        // elsewhere", the box, with no help text (Fields; Rule 3).
        await author.relations.choose(TEXT.none);
        await expect(author.relations.choice(TEXT.none)).toBeChecked();
        await expect(author.relations.doiBox()).toHaveCount(0);
        await author.relations.choose(TEXT.published);
        await expect(author.relations.doiBox()).toBeVisible();
        await expect(author.relations.doiField()).toContainText(TEXT.doiLabel);
        await expect(author.relations.doiHelp()).toHaveCount(0);

        // Saved: "Saved" beside the button; the panel keeps the choice and
        // the address (Rule 5a).
        await author.relations.typeDoi(DOI_ABCD);
        await author.relations.save();
        await author.relations.expectTicked(TEXT.published);
        await expect(author.relations.doiBox()).toHaveValue(DOI_ABCD);

        // After a reload: the saved relation (Rules 4, 5a).
        await author.page.reload();
        await author.frame.expectPageHeading('Title & Abstract');
        await author.relations.open();
        await author.relations.expectTicked(TEXT.published);
        await expect(author.relations.doiBox()).toHaveValue(DOI_ABCD);

        // The Preprint Server Manager's "Preview": under the preview line,
        // the notice and the DOI line with its link, above the "Preprint"
        // label line and the title (Actors, "See the relation"; Rule 8).
        await manager.frame.gotoEditorial(submission.submissionId);
        await manager.frame.expectVersionLoaded();
        await pressPreview(manager.page, manager.frame);
        const preview = preprintPage(manager.page, SERVER, 'en');
        await preview.expectLoaded();
        const notice = await expectRelationNotice(preview, [TEXT.published, `${TEXT.doiLabel} ${DOI_ABCD}`], [LANDING_TEXT.preview]);
        await expect(notice.getByRole('link', {name: DOI_ABCD, exact: true})).toHaveAttribute('href', DOI_ABCD);

        // The Activity Log: "Submission metadata updated" under the Author's
        // name (Side effects).
        await manager.frame.gotoEditorial(submission.submissionId);
        await manager.frame.expectVersionLoaded();
        expect(await metadataLinesBy(manager.page, manager.frame, 'Alex Author')).toBe(logBefore + 1);

        // Control: the Author's workflow offers no "Preview" (the Manager's
        // header did, read the same way; Actors, "See the relation").
        await expect(manager.frame.headerButton('Preview')).toBeVisible();
        await expect(author.frame.headerButton('Library')).toBeVisible();
        await expect(author.frame.headerButton('Preview')).toHaveCount(0);
        await expect(author.page.getByRole('button', {name: 'Preview', exact: true})).toHaveCount(0);
    });

    test('S2: a Preprint Server Manager records it on a posted preprint', async ({browser, baseURL, asUser, opsApi, pkpMail, appContext}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s2', testInfo);
        const managerName = `${tag}mg`;
        const authorName = `${tag}au`;
        const spare = `${tag}x`;
        await opsApi.createContext({
            tag,
            users: [
                user(managerName, 'Mona', 'Manager', ['manager']),
                user(authorName, 'Ada', 'Author', ['author']),
                user(spare, 'Xena', 'Spare', ['author']),
            ],
            doiPrefix: '10.1234',
            plugins: {crossrefplugin: {enabled: true, settings: DEPOSITOR}},
            registrationAgency: 'crossrefplugin',
        });
        const [submission, control] = await Promise.all([
            opsApi.createSubmission({tag, context: tag, submitter: authorName, published: true, title: `Relations ${tag}`}),
            opsApi.createSubmission({tag: `${tag}c`, context: tag, submitter: spare, title: `Control ${tag}`}),
        ]);
        const {page, frame, relations} = await pageAs(asUser, appContext, managerName, tag);
        const dois = new DoisPage(page, tag);
        const doiRow = dois.row(submission.submissionId);

        // Given: the preprint's DOI marked "Registered" on the DOIs page.
        await dois.goto();
        await dois.runBulk('Mark DOIs Registered', [submission.submissionId]);
        await expect(dois.rowBadge(doiRow)).toHaveText('Registered');

        // Before any save: the visitor's page shows no notice (Rules 2a, 8).
        const visitor = preprintPage(await visitorPage(browser, baseURL), tag, '');
        await visitor.goto(submission.submissionId);
        await expect(visitor.labelLineParts().first()).toBeVisible();
        await expect(visitor.notices()).toHaveCount(0);

        // Not saved: none ticked; "published elsewhere" and an address typed
        // without "Save"; "Contributors" of the same version shows
        // "Relations" too, its panel holding them and nothing else; after a
        // reload none is ticked (Rules 4, 5d).
        await openTitleAbstract(frame, submission.submissionId, submission.publicationId);
        const logBefore = await metadataLinesBy(page, frame, 'Mona Manager');
        await relations.open();
        await relations.expectNoneTicked();
        await relations.choose(TEXT.published);
        await relations.typeDoi(DOI_ELSEWHERE);
        await frame.select('Contributors', 'Preprint: Contributors');
        await expect(relations.button()).toBeVisible();
        await relations.open();
        await relations.expectTicked(TEXT.published);
        await expect(relations.doiBox()).toHaveValue(DOI_ELSEWHERE);
        expect(await relations.panelLines()).toEqual(PANEL_WITH_BOX);
        await page.reload();
        await frame.expectPageHeading('Contributors');
        await relations.open();
        await relations.expectNoneTicked();

        // Saved on the posted preprint (Rule 5a).
        await relations.choose(TEXT.published);
        await relations.typeDoi(DOI_ELSEWHERE);
        await relations.save();

        // The visitor's page: the notice with the DOI line, its link to the
        // address in the same tab (Actors, "See the relation"; Rules 5a, 8).
        await visitor.reload();
        const notice = await expectRelationNotice(visitor, [TEXT.published, `${TEXT.doiLabel} ${DOI_ELSEWHERE}`]);
        const link = notice.getByRole('link', {name: DOI_ELSEWHERE, exact: true});
        await expect(link).toHaveAttribute('href', DOI_ELSEWHERE);
        await expect(link).not.toHaveAttribute('target', /.+/);

        // The Activity Log: the line under the manager's name (Side effects).
        await openTitleAbstract(frame, submission.submissionId, submission.publicationId);
        expect(await metadataLinesBy(page, frame, 'Mona Manager')).toBe(logBefore + 1);

        // The DOIs page: still "Registered", after a reload too (Rule 11).
        await dois.goto();
        await expect(dois.rowBadge(doiRow)).toHaveText('Registered');
        await dois.reload();
        await expect(dois.rowBadge(doiRow)).toHaveText('Registered');

        // No DOI: the box emptied and saved; the notice alone, no DOI line
        // and no link (Fields; Rule 8).
        await openTitleAbstract(frame, submission.submissionId, submission.publicationId);
        await relations.open();
        await relations.expectTicked(TEXT.published);
        await expect(relations.doiBox()).toHaveValue(DOI_ELSEWHERE);
        await relations.typeDoi('');
        await relations.save();
        await visitor.reload();
        const bare = await expectRelationNotice(visitor, [TEXT.published]);
        await expect(bare.getByRole('link')).toHaveCount(0);

        // No mail: bounded by the one mail the test sends itself, a
        // discussion with the spare on the spare's own preprint (Side
        // effects; A8). The manager opened it and is on it: its copy of the
        // control is its only mail.
        const discussion = `Control ${tag}`;
        await openWorkflow(page, tag, control.submissionId);
        await new PublicationScreen(page).openProductionStage();
        await addDiscussion(page, {name: discussion, message: `Control message ${tag}.`, participants: [spare]});
        const afterControl = {to: mailOf(spare), subject: discussion};
        await pkpMail.expectNone({to: mailOf(authorName), afterControl});
        await expect.poll(() => pkpMail.count({to: mailOf(managerName), subject: discussion}), {timeout: 20_000}).toBe(1);
        expect(await pkpMail.count({to: mailOf(managerName), contains: tag})).toBe(1);

        // Control: "not published elsewhere" saved; the visitor's page shows
        // no notice (Rule 8).
        await openTitleAbstract(frame, submission.submissionId, submission.publicationId);
        await relations.open();
        await relations.choose(TEXT.none);
        await relations.save();
        await visitor.reload();
        await expect(visitor.labelLineParts().first()).toBeVisible();
        await expect(visitor.notices()).toHaveCount(0);
    });

    test('S3: a Moderator\'s save, with and without the edit permission', async ({browser, baseURL, asUser, opsApi, appContext}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s3', testInfo);
        const [first, second] = await Promise.all([
            opsApi.createSubmission({
                tag: `${tag}a`,
                context: SERVER,
                submitter: AUTHOR,
                published: true,
                title: `Relations ${tag} one`,
                participants: [{username: MODERATOR, role: 'sectionEditor'}],
            }),
            opsApi.createSubmission({
                tag: `${tag}b`,
                context: SERVER,
                submitter: AUTHOR,
                published: true,
                title: `Relations ${tag} two`,
                participants: [{username: MODERATOR, role: 'sectionEditor', canChangeMetadata: false}],
            }),
        ]);
        const {page, frame, relations} = await pageAs(asUser, appContext, MODERATOR, SERVER);
        const visitor = preprintPage(await visitorPage(browser, baseURL), SERVER, 'en');

        // With the edit permission: none ticked; saved with "Saved" (Actors,
        // "Open" and "Save a relation"; Rule 5a).
        await openTitleAbstract(frame, first.submissionId, first.publicationId);
        const logBefore = await metadataLinesBy(page, frame, MODERATOR_NAME);
        await relations.open();
        await relations.expectNoneTicked();
        await relations.choose(TEXT.published);
        await relations.typeDoi(DOI_MODERATED);
        const accepted = await relations.save();

        // The visitor's first page: the notice with the DOI line (Rule 8).
        await visitor.goto(first.submissionId);
        await expectRelationNotice(visitor, [TEXT.published, `${TEXT.doiLabel} ${DOI_MODERATED}`]);

        // The Activity Log: the line under the Moderator's name (Side effects).
        expect(await metadataLinesBy(page, frame, MODERATOR_NAME)).toBe(logBefore + 1);

        // Without the edit permission: the save is refused (its answer is
        // not OK and no "Saved" shows) and nothing is written: after a
        // reload none is ticked (Actors, "Save a relation"; Rule 5c).
        await openTitleAbstract(frame, second.submissionId, second.publicationId);
        await relations.open();
        await relations.choose(TEXT.published);
        await relations.typeDoi(DOI_REFUSED);
        const refused = await relations.pressSave();
        expect(refused.ok(), `the refused save answers ${refused.status()}`).toBe(false);
        await expect(relations.savedStatus()).toHaveCount(0);
        await page.reload();
        await frame.expectPageHeading('Title & Abstract');
        await relations.open();
        await relations.expectNoneTicked();

        // The visitor's second page: no notice (Rule 8).
        await visitor.goto(second.submissionId);
        await expect(visitor.labelLineParts().first()).toBeVisible();
        await expect(visitor.notices()).toHaveCount(0);

        // Control: the same save on the first preprint went through with
        // "Saved" (Actors, "Save a relation").
        expect(accepted.status()).toBe(200);
    });

    test('S4: each answer before posting: the preview and "Post the preprint"', async ({asUser, opsApi, appContext}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s4', testInfo);
        const submission = await opsApi.createSubmission({tag, context: SERVER, submitter: AUTHOR, title: `Relations ${tag}`});
        const {page, frame, relations, post} = await pageAs(asUser, appContext, MANAGER, SERVER);
        const preview = preprintPage(page, SERVER, 'en');
        const open = () => openTitleAbstract(frame, submission.submissionId, submission.publicationId);

        /** "Post": the window's one "Related Publication" line; closed without posting. */
        const postLineReads = async (text) => {
            await post.open();
            await expect(post.relationLine()).toHaveText(text);
            return post;
        };
        /** "Preview": the preview line and the notices after it; back to the workflow. */
        const previewReads = async (relationLines) => {
            await pressPreview(page, frame);
            await preview.expectLoaded();
            if (relationLines) {
                const notice = await expectRelationNotice(preview, relationLines, [LANDING_TEXT.preview]);
                await open();
                return notice;
            }
            await expect(preview.notices()).toHaveText([LANDING_TEXT.preview]);
            await open();
            return null;
        };
        /** Tick a choice and save it, "Saved"; the panel closed again. */
        const saveChoice = async (label) => {
            await relations.open();
            await relations.choose(label);
            await relations.save();
            await relations.close();
        };

        // Never answered: none ticked; "Post" reads "not entered"; the
        // preview has no relation notice (Rules 2a, 8, 9).
        await open();
        await relations.open();
        await relations.expectNoneTicked();
        await relations.close();
        await (await postLineReads(TEXT.unknown)).close();
        await previewReads(null);

        // "Not entered" saved (Rules 2, 8, 9).
        await saveChoice(TEXT.unknown);
        await (await postLineReads(TEXT.unknown)).close();
        await previewReads(null);

        // Not published elsewhere (Rules 8, 9).
        await saveChoice(TEXT.none);
        await (await postLineReads(TEXT.none)).close();
        await previewReads(null);

        // Published elsewhere, no DOI: "…but no DOI is available yet."; the
        // preview's notice alone; after a reload the box is empty (Fields;
        // Rules 8, 9).
        await saveChoice(TEXT.published);
        await (await postLineReads(TEXT.postNoDoi)).close();
        await previewReads([TEXT.published]);
        await page.reload();
        await frame.expectPageHeading('Title & Abstract');
        await relations.open();
        await relations.expectTicked(TEXT.published);
        await expect(relations.doiBox()).toHaveValue('');

        // Not a full web address: the box's message, the summary with its
        // two buttons, the page notice, "Save" disabled; after a reload the
        // box is empty (Fields; Rule 5b).
        await relations.typeDoi(BARE_DOI);
        await relations.saveButton().click();
        await expect(relations.doiError()).toHaveText(TEXT.invalidUrl);
        await expect(relations.errorSummary()).toContainText(TEXT.oneError);
        await expect(relations.goToErrorButton()).toBeAttached();
        await expect(relations.nextErrorButton()).toBeVisible();
        await expect(relations.notSavedNotice()).toBeVisible();
        await expect(relations.saveButton()).toBeDisabled();
        await expect.poll(() => relations.panelLines()).toEqual([
            TEXT.legend,
            ...RELATION_CHOICES,
            TEXT.doiLabel,
            TEXT.invalidUrl,
            TEXT.oneError,
            TEXT.goToError,
            TEXT.nextError,
            TEXT.save,
        ]);
        await page.reload();
        await frame.expectPageHeading('Title & Abstract');
        await relations.open();
        await relations.expectTicked(TEXT.published);
        await expect(relations.doiBox()).toHaveValue('');

        // Another web address: "Post" reads "…has been published.", the word
        // a link to it in a new tab; the preview's notice with the DOI line
        // and its link (Fields; Rules 8, 9).
        await relations.typeDoi(OTHER_ADDRESS);
        await relations.save();
        await relations.close();
        const window = await postLineReads(TEXT.withDoi);
        await expect(window.relationLink()).toHaveText('published');
        await expect(window.relationLink()).toHaveAttribute('href', OTHER_ADDRESS);
        await expect(window.relationLink()).toHaveAttribute('target', '_blank');
        await window.close();
        await pressPreview(page, frame);
        await preview.expectLoaded();
        const notice = await expectRelationNotice(preview, [TEXT.published, `${TEXT.doiLabel} ${OTHER_ADDRESS}`], [LANDING_TEXT.preview]);
        await expect(notice.getByRole('link', {name: OTHER_ADDRESS, exact: true})).toHaveAttribute('href', OTHER_ADDRESS);

        // Control: after the last window was closed, "Preview" still opens
        // under the preview line (Rule 8): the first notice read above.
        await expect(preview.notices().first()).toHaveText(LANDING_TEXT.preview);
    });

    test('S5: the Review step reads the answer', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s5', testInfo);
        const draft = await opsApi.createSubmission({tag, context: SERVER, submitter: AUTHOR, submitted: false, title: `Relations ${tag}`});
        const page = await (await asUser(AUTHOR)).newPage();
        const radio = (label) => page.getByRole('radio', {name: label, exact: true});
        const doiBox = page.locator('input[name="vorDoi"]');
        const line = reviewRelationLine(page);

        // Given: the draft's wizard, from "1 Upload Files" to "For Readers".
        await page.goto(wizardUrl(SERVER, draft.submissionId));
        await expectStep(page, STEPS.files);
        await continueTo(page, STEPS.details);
        await continueTo(page, STEPS.contributors);
        await continueTo(page, STEPS.readers);

        // Published elsewhere, with a DOI: "This preprint has been
        // published.", the word a link to the DOI in a new tab (Rule 7).
        await radio(TEXT.published).check();
        await doiBox.fill(DOI_ABCD);
        await openReview(page);
        await expect(line).toHaveText(TEXT.withDoi);
        const link = line.getByRole('link');
        await expect(link).toHaveText('published');
        await expect(link).toHaveAttribute('href', DOI_ABCD);
        await expect(link).toHaveAttribute('target', '_blank');

        // Published elsewhere, no DOI (Rule 7).
        await gotoStep(page, STEPS.readers);
        await expect(radio(TEXT.published)).toBeChecked();
        await doiBox.fill('');
        await openReview(page);
        await expect(line).toHaveText(TEXT.published);

        // Control: that line carries no link (the first line's did, read
        // the same way; Rule 7).
        await expect(line.getByRole('link')).toHaveCount(0);

        // "Not entered" (Rule 7).
        await gotoStep(page, STEPS.readers);
        await radio(TEXT.unknown).check();
        await openReview(page);
        await expect(line).toHaveText(TEXT.unknown);

        // Not published elsewhere (Rule 7).
        await gotoStep(page, STEPS.readers);
        await radio(TEXT.none).check();
        await openReview(page);
        await expect(line).toHaveText(TEXT.none);
    });

    test('S6: each version keeps its own relation', async ({browser, baseURL, asUser, opsApi, appContext}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s6', testInfo);
        const submission = await opsApi.createSubmission({tag, context: SERVER, submitter: AUTHOR, published: true, title: `Relations ${tag}`});
        const {page, frame, relations, post} = await pageAs(asUser, appContext, MANAGER, SERVER);
        const first = submission.publicationId;

        // Given: the version holds "published elsewhere" with the DOI, saved
        // through "Relations".
        await openTitleAbstract(frame, submission.submissionId, first);
        await relations.open();
        await relations.choose(TEXT.published);
        await relations.typeDoi(DOI_ELSEWHERE);
        await relations.save();
        await relations.close();

        // A new version starts with the relation it was made from (Rule 1a).
        const created = await createNewVersion(page);
        const second = created.id;
        await openTitleAbstract(frame, submission.submissionId, second);
        await relations.open();
        await relations.expectTicked(TEXT.published);
        await expect(relations.doiBox()).toHaveValue(DOI_ELSEWHERE);

        // The new version's own answer (Rules 1, 5a).
        await relations.choose(TEXT.none);
        await relations.save();

        // The first version keeps its own (Rules 1, 1a).
        await openTitleAbstract(frame, submission.submissionId, first);
        await relations.open();
        await relations.expectTicked(TEXT.published);
        await expect(relations.doiBox()).toHaveValue(DOI_ELSEWHERE);
        await relations.close();

        // Posting the new version: its line reads "not published
        // elsewhere"; posted from the window (Rule 9).
        await openTitleAbstract(frame, submission.submissionId, second);
        await post.open();
        await expect(post.relationLine()).toHaveText(TEXT.none);
        const posted = await post.post();
        expect(posted.status()).toBe(200);

        // The first version's page: under the older-version notice, the
        // relation notice with the DOI line, above the label line and the
        // title (Rules 1, 8).
        const visitor = preprintPage(await visitorPage(browser, baseURL), SERVER, 'en');
        await visitor.goto(submission.submissionId, {version: first});
        const notice = await expectRelationNotice(visitor, [TEXT.published, `${TEXT.doiLabel} ${DOI_ELSEWHERE}`], [OUTDATED]);
        await expectPrecedes(visitor.notices().first(), notice);

        // Control: the preprint's page, now the new version, has no notice,
        // nor has the new version's own address (Rule 8; U13 Rule 2).
        await visitor.goto(submission.submissionId);
        await expect(visitor.labelLineParts().first()).toBeVisible();
        await expect(visitor.notices()).toHaveCount(0);
        await visitor.goto(submission.submissionId, {version: second});
        await expect(visitor.labelLineParts().first()).toBeVisible();
        await expect(visitor.notices()).toHaveCount(0);
    });
});
