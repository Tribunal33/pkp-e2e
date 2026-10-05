// @ts-check
/**
 * @file playwright/tests/U47-media-files.spec.js
 *
 * Media files — OJS suite, one test per canonical scenario the spec runs on
 * OJS (S1–S6 common; S7 {OJS OMP}; S8 is the press's, in the OMP tree).
 * Spec: docs/specs/U47-media-files.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1 🐞: every role these scenarios use has its changes accepted; no
 *   refused change is driven.
 * - A2 ❓: the "ID" cell is read for sharing (one cell spanning a pair, a
 *   cell of its own), never for its number.
 * - A3 🐞: the empty upload window is read for what shows; the
 *   screen-reader-only button is not asserted either way.
 * - A4 🐞: no upload goes past the host's limit (seed-facts.md).
 * - OJS1 ❓: S7's reader is signed in, the one reader who always gets the
 *   current page.
 * - OMP2, OPS1: the press's and the preprint server's, in those trees.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only. S1 and S2 run on publicknowledge on their own scratch
 * submissions (`manager.maya`, submitter `author.alex`); S3–S7 run on
 * scratch journals with throwaway accounts (the username twice as
 * password), as footnote t says: `mediaFiles[]` (names, media types,
 * resolutions, pairs), `components` (S6), `roles` with
 * `participants[]` (S4), `decisions`, `galleys[]` (S7), `published` with
 * the journal's `issues[]` (S5, S7). No key makes a second version: S5 uses
 * "Create New Version" (U49's opener). S7's reader reads the galley signed
 * in (OJS1).
 *
 * Every absence is read settled and paired with a positive control taken
 * the same way (M4, M6); S3's mailbox silence is bounded by a "Notify" the
 * test sends to a spare account of its own journal (A8). Browser dialogs
 * are recorded with their type and accepted on every page (the page-leave
 * question). Downloads are read through the browser's own response to the
 * name link (the new tab's download event never fires headless, ccK1).
 * Waits are web-first or bounded by the screen's own answer (A5).
 * Everything runs in the parallel `ojs` project.
 */
const path = require('path');
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {ActivityLogWindow} = require('../../../../shared/playwright/pages/ActivityLogPages.js');
const {InformationCenter} = require('../../../../shared/playwright/pages/SubmissionFilesPages.js');
const {MySubmissionsPage} = require('../../../../shared/playwright/pages/MySubmissionsPage.js');
const {readerGalleyLinks} = require('../../../../shared/playwright/pages/GalleysPages.js');
const {
    MEDIA_TEXT: TEXT,
    MediaFileManager,
    mediaDeleteQuestion,
    recordPageDialogs,
} = require('../../../../shared/playwright/pages/MediaFilesPages.js');
const {pastCloseWindow} = require('../../../../shared/playwright/pages/IdentifiersPages.js');
const {PublicationScreen} = require('../pages/PublicationMetadataPages.js');
const {PublishScreen} = require('../pages/PublishSchedulePages.js');

const JOURNAL = 'publicknowledge';
const MANAGER = 'manager.maya';
const AUTHOR = 'author.alex';
const IMAGE = 'Image';
const MULTIMEDIA = 'Multimedia';
const STYLESHEET = 'HTML Stylesheet';
const PRODUCTION = ['sendExternalReview', 'accept', 'sendToProduction'];
const ISSUE = {volume: 1, number: 1, year: 2026};
const NOTIFY_SUBJECT = 'Discussion (Submission)';
const FILES = path.join(__dirname, '..', 'fixtures', 'files');
const fixture = (name) => path.join(FILES, name);

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u47${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: mailOf(username), roles};
}

/** Today as the list's short date shows it (the install's `Y-m-d`; the runner is on UTC). */
function today() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Seed a scratch journal with a throwaway Journal Manager and Author, and
 * `extra` accounts; returns the usernames.
 */
async function seedJournal(ojsApi, tag, {extra = [], ...keys} = {}) {
    const users = [user(`${tag}mg`, 'Mona', 'Manager', ['manager']), user(`${tag}au`, 'Ada', 'Author', ['author']), ...extra];
    await ojsApi.createContext({tag, users, ...keys});
    return {manager: `${tag}mg`, author: `${tag}au`};
}

/**
 * A page as `username`: the workflow frame of `contextPath`, the Media page
 * object and a recorder of every browser dialog (accepted).
 */
async function pageAs(asUser, username, contextPath) {
    const page = await (await asUser(username)).newPage();
    const frame = new WorkflowPage(page, contextPath);
    return {page, frame, media: new MediaFileManager(page, frame), dialogs: recordPageDialogs(page)};
}

/**
 * The Activity Log's "The metadata for file …" lines per file name, by
 * `username`; the window opened and closed again.
 */
async function metadataCounts(page, frame, names, username) {
    const log = new ActivityLogWindow(page, frame);
    await log.open();
    const events = (await log.historyLines()).map((line) => line.event);
    await log.close();
    await pastCloseWindow(page);
    return Object.fromEntries(
        names.map((name) => [name, events.filter((e) => e === `The metadata for file "${name}" was edited by ${username}.`).length])
    );
}

/** The Tasks bell's number in the workflow panel's own header (0 without a badge). */
async function bellCount(frame) {
    const bell = frame.dialog().getByRole('button', {name: /^Tasks/});
    await expect(bell).toBeVisible({timeout: 30_000});
    const text = (await bell.innerText()).replace(/\s+/g, ' ').trim();
    const match = text.match(/^Tasks(?: (\d+))?$/);
    if (!match) {
        throw new Error(`the bell reads "${text}"`);
    }
    return match[1] ? Number(match[1]) : 0;
}

/**
 * The HTML galley's figure (`img[alt="Figure 1"]`) on the reader's galley
 * page, once the frame has settled: its natural width, 0 when the image
 * does not load (120 is the web `figure.png`, 400 `profile-image-400.png`).
 */
async function figureWidth(page) {
    const frame = page.frameLocator('iframe').first();
    const img = frame.locator('img[alt="Figure 1"]');
    await expect(img).toBeAttached({timeout: 30_000});
    return img.evaluate(async (/** @type {HTMLImageElement} */ el) => {
        const deadline = Date.now() + 20_000;
        while (!el.complete && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return el.complete ? el.naturalWidth : -1;
    });
}

test.describe('media files', () => {
    test('S1: add media files', {tag: '@smoke'}, async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s1', testInfo);
        const submission = await ojsApi.createSubmission({
            tag,
            context: JOURNAL,
            submitter: AUTHOR,
            title: `Media ${tag}`,
            decisions: ['sendExternalReview'],
        });
        const {page, frame, media} = await pageAs(asUser, MANAGER, JOURNAL);

        // An empty page, the article still in Review: side menu › the
        // version › "Media"; the heading, the one table "Media Files" with
        // its line, the two buttons above it, "No Items" (Fields; Rule 10).
        await frame.gotoEditorial(submission.submissionId);
        await media.openFromMenu();
        await expect(frame.heading()).toHaveText('Publication: Media');
        await expect(media.table()).toHaveCount(1);
        await expect(media.namedTable()).toBeVisible();
        await expect(media.label()).toHaveText(TEXT.tableLabel);
        await expect(media.descriptionLine()).toHaveText(TEXT.description);
        await expect(media.batchButton()).toBeVisible();
        await expect(media.addButton()).toBeVisible();
        const tableTop = (await media.table().boundingBox())?.y ?? 0;
        expect((await media.batchButton().boundingBox())?.y ?? Infinity).toBeLessThan(tableTop);
        expect((await media.addButton().boundingBox())?.y ?? Infinity).toBeLessThan(tableTop);
        await expect(media.noItems()).toHaveText(TEXT.noItems);

        // "Batch Link Media" with no web-resolution file: "No Items",
        // "Link Media" greyed out; "Cancel" closes at once (Rules 3b, 6).
        const batch = await media.openBatch();
        await expect(batch.table()).toContainText(TEXT.noItems);
        await expect(batch.linkButton()).toBeDisabled();
        await batch.cancel();

        // The "Upload Media File" window: its line, "Upload File", the drop
        // area; no "Upload Files" while the drop area shows (Fields).
        let upload = await media.openUpload();
        await expect(upload.descriptionLine()).toHaveText(TEXT.uploadDescription);
        await expect(upload.uploaderHeading()).toHaveText(TEXT.uploadHeading);
        await expect(upload.dropArea()).toContainText(TEXT.dragAndDrop);
        await expect(upload.dropArea()).toContainText(TEXT.or);
        await expect(upload.clickToUpload()).toBeVisible();
        await expect(upload.uploadFilesButton()).toHaveCount(0);

        // A card: its name, size and red "Remove"; once uploaded the two
        // lists, nothing chosen and "Web resolution" greyed out, and
        // "Upload Files" greyed out (Fields; Rule 2).
        await upload.chooseFiles([fixture('figure.png')]);
        await expect(upload.cardName('figure.png')).toHaveText('figure.png');
        await expect(upload.cardSize('figure.png')).toHaveText(/\d/);
        await expect(upload.removeButton('figure.png')).toBeVisible();
        await expect(upload.removeButton('figure.png')).toHaveClass(/text-negative/);
        await upload.expectUploaded('figure.png');
        await expect(upload.cardLabels('figure.png')).toHaveText([TEXT.mediaTypeLabel, TEXT.resolutionLabel]);
        await expect(upload.cardHelp('figure.png')).toHaveText([TEXT.mediaTypeHelp, TEXT.resolutionHelp]);
        expect(await upload.selectedText(upload.mediaTypeSelect('figure.png'))).toBe('');
        expect(await upload.selectedText(upload.resolutionSelect('figure.png'))).toBe(TEXT.web);
        await expect(upload.resolutionSelect('figure.png')).toBeDisabled();
        await expect(upload.uploadFilesButton()).toBeVisible();
        await expect(upload.uploadFilesButton()).toBeDisabled();

        // The resolution list: choosable for "Image"; "Multimedia" after
        // "High resolution" sets it back to "Web resolution", greyed out
        // (Rule 2a).
        await upload.chooseMediaType('figure.png', IMAGE);
        await expect(upload.resolutionSelect('figure.png')).toBeEnabled();
        await upload.chooseResolution('figure.png', TEXT.high);
        expect(await upload.selectedText(upload.resolutionSelect('figure.png'))).toBe(TEXT.high);
        await upload.chooseMediaType('figure.png', MULTIMEDIA);
        await expect(upload.resolutionSelect('figure.png')).toBeDisabled();
        await expect.poll(() => upload.selectedText(upload.resolutionSelect('figure.png'))).toBe(TEXT.web);

        // "Close" with a card: the "Warning" dialog; "No" keeps the card;
        // "Yes" closes and nothing is added (Rule 2d).
        await upload.pressExpectingWarning(upload.closeButton());
        await upload.answerNo();
        await expect(upload.card('figure.png')).toHaveCount(1);
        await upload.pressExpectingWarning(upload.closeButton());
        await upload.answerYes();
        await expect(media.noItems()).toHaveText(TEXT.noItems);

        // Four cards and a "Remove"; "Upload Files" greyed out while a card
        // has no media type (Rule 2b; Fields, Upload Files).
        upload = await media.openUpload();
        await upload.chooseFiles(['figure.png', 'profile-image-400.png', 'not-an-image.txt', 'replacement.pdf'].map(fixture));
        await expect(upload.cards()).toHaveCount(4);
        await upload.removeCard('replacement.pdf');
        await expect(upload.cards()).toHaveCount(3);
        for (const name of ['figure.png', 'profile-image-400.png', 'not-an-image.txt']) {
            await upload.expectUploaded(name);
        }
        await upload.chooseMediaType('figure.png', IMAGE);
        await upload.chooseResolution('figure.png', TEXT.web);
        await upload.chooseMediaType('profile-image-400.png', IMAGE);
        await upload.chooseResolution('profile-image-400.png', TEXT.high);
        await expect(upload.uploadFilesButton()).toBeDisabled();
        await upload.chooseMediaType('not-an-image.txt', STYLESHEET);
        await expect(upload.uploadFilesButton()).toBeEnabled();

        // The new rows: three, each with its type, size, today's date and
        // an "ID" of its own; no "replacement.pdf" (Rule 2).
        await upload.submit();
        await media.expectNames(['figure.png', 'profile-image-400.png', 'not-an-image.txt']);
        await expect(media.rows()).toHaveCount(3);
        await expect(media.row('replacement.pdf')).toHaveCount(0);
        await media.expectType('figure.png', [IMAGE]);
        await media.expectType('profile-image-400.png', [IMAGE, TEXT.highBadge]);
        await media.expectType('not-an-image.txt', [STYLESHEET]);
        for (const name of ['figure.png', 'profile-image-400.png', 'not-an-image.txt']) {
            await expect(media.sizeCell(name)).toHaveText(/\d/);
            await expect(media.dateCell(name)).toHaveText(today());
            await media.expectAlone(name);
        }

        // The file name: a new tab, and the browser downloads the file
        // (Fields, File Name).
        const got = await media.download('figure.png');
        expect(got.newTab).toBe(true);
        expect(got.status).toBe(200);
        expect(got.disposition).toMatch(/attachment/);

        // The Activity Log: an upload line naming each file (Side effects).
        const log = new ActivityLogWindow(page, frame);
        await log.open();
        const events = (await log.historyLines()).map((line) => line.event);
        await log.close();
        await pastCloseWindow(page);
        for (const name of ['figure.png', 'profile-image-400.png', 'not-an-image.txt']) {
            expect(events.some((e) => e.includes(`"${name}"`) && /was uploaded/.test(e)), `an upload line for ${name}`).toBe(true);
        }

        // Control: the stylesheet's menu has no "Manually Link Media", the
        // image's has (Fields, More Actions).
        expect(await media.menuOffers('not-an-image.txt')).toEqual(['More Information', 'Edit Metadata', 'Delete File']);
        expect(await media.menuOffers('figure.png')).toEqual(TEXT.menuFull);
    });

    test('S2: link a web image to its high-resolution original', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s2', testInfo);
        const submission = await ojsApi.createSubmission({
            tag,
            context: JOURNAL,
            submitter: AUTHOR,
            title: `Media ${tag}`,
            decisions: PRODUCTION,
            mediaFiles: [
                {file: 'figure.png', name: 'fig1-web.png'},
                {file: 'not-an-image.png', name: 'fig2-web.png'},
                {file: 'profile-image-400.png', resolution: 'high_resolution', name: 'fig1-high.png'},
                {file: 'not-an-image.txt', resolution: 'high_resolution', name: 'fig2-high.png'},
            ],
        });
        const {page, frame, media} = await pageAs(asUser, MANAGER, JOURNAL);

        // Captions on three files, then the Activity Log's counts (Rule 4).
        await frame.gotoEditorial(submission.submissionId);
        await media.openFromMenu();
        await media.expectNames(['fig1-web.png', 'fig2-web.png', 'fig1-high.png', 'fig2-high.png']);
        for (const [name, caption] of [
            ['fig1-web.png', 'Web caption'],
            ['fig1-high.png', 'High caption'],
            ['fig2-web.png', 'Batch caption'],
        ]) {
            const win = await media.openMetadata(name);
            await win.type('Caption', caption);
            await win.submit();
        }
        const beforeLink = await metadataCounts(page, frame, ['fig1-web.png', 'fig1-high.png'], MANAGER);
        expect(beforeLink['fig1-web.png']).toBeGreaterThan(0);
        expect(beforeLink['fig1-high.png']).toBeGreaterThan(0);

        // "Manually Link Media" from a high-resolution row: "Selected File"
        // greyed out, the list's label, help, "No web version file" chosen
        // and the web files offered (Fields; Rule 3a).
        let link = await media.openManualLink('fig1-high.png');
        await expect(link.selectedFileBox()).toHaveValue('fig1-high.png');
        await expect(link.selectedFileBox()).toBeDisabled();
        await expect(link.help(TEXT.linkLabel)).toHaveText(TEXT.linkHelp);
        await expect(link.chosen()).toHaveText(TEXT.noWeb);
        let options = await link.options();
        expect(options.at(-1)).toBe(TEXT.noWeb);
        expect(options.slice(0, -1).sort()).toEqual(['fig1-web.png', 'fig2-web.png']);

        // "Cancel" with a change: the "Warning" dialog; "No" keeps the
        // choice (Rule 6).
        await link.choose('fig1-web.png');
        await link.pressExpectingWarning(link.cancelButton());
        await link.answerNo();
        await expect(link.chosen()).toHaveText('fig1-web.png');

        // The link: one "ID" cell, the web file first (Rules 3, 3a).
        await link.submit();
        await media.expectPair('fig1-web.png', 'fig1-high.png');

        // The details copied from the file the link was made from; "Cancel"
        // closes at once (Rules 3c, 6).
        let meta = await media.openMetadata('fig1-web.png');
        await expect(meta.box('Caption')).toHaveValue('High caption');
        await meta.cancel();

        // The Activity Log after the link: once more for fig1-high.png,
        // twice more for fig1-web.png (Side effects).
        const afterLink = await metadataCounts(page, frame, ['fig1-web.png', 'fig1-high.png'], MANAGER);
        expect(afterLink['fig1-high.png']).toBe(beforeLink['fig1-high.png'] + 1);
        expect(afterLink['fig1-web.png']).toBe(beforeLink['fig1-web.png'] + 2);

        // A web row's list: "No high-resolution file" chosen, fig2-high.png
        // alone offered; "Cancel" closes at once (Rules 3a, 6).
        link = await media.openManualLink('fig2-web.png');
        await expect(link.chosen()).toHaveText(TEXT.noHigh);
        expect(await link.options()).toEqual(['fig2-high.png', TEXT.noHigh]);
        await link.cancel();

        // Relinking ends the earlier pair (Rule 3a).
        link = await media.openManualLink('fig1-web.png');
        await expect(link.chosen()).toHaveText('fig1-high.png');
        await link.choose('fig2-high.png');
        await link.submit();
        await media.expectPair('fig1-web.png', 'fig2-high.png');
        await media.expectAlone('fig1-high.png');

        // Unlinking: both stand alone; one more log line for each (Rule 3a;
        // Side effects).
        const beforeUnlink = await metadataCounts(page, frame, ['fig1-web.png', 'fig2-high.png'], MANAGER);
        link = await media.openManualLink('fig1-web.png');
        await link.choose(TEXT.noHigh);
        await link.submit();
        await media.expectAlone('fig1-web.png');
        await media.expectAlone('fig2-high.png');
        const afterUnlink = await metadataCounts(page, frame, ['fig1-web.png', 'fig2-high.png'], MANAGER);
        expect(afterUnlink['fig1-web.png']).toBe(beforeUnlink['fig1-web.png'] + 1);
        expect(afterUnlink['fig2-high.png']).toBe(beforeUnlink['fig2-high.png'] + 1);

        // "Batch Link Media": its line, columns, one row per web file, each
        // on "No high-resolution file"; a choice leaves the other row's
        // list; "Link Media" makes two pairs (Fields; Rule 3b).
        let batch = await media.openBatch();
        await expect(batch.descriptionLine()).toHaveText(TEXT.batchDescription);
        await expect(batch.columnHeaders()).toHaveText(TEXT.batchColumns);
        await expect.poll(async () => (await batch.webNames().allInnerTexts()).map((t) => t.trim()).sort()).toEqual([
            'fig1-web.png',
            'fig2-web.png',
        ]);
        for (const web of ['fig1-web.png', 'fig2-web.png']) {
            await expect(batch.chosen(web)).toHaveText(TEXT.noHigh);
            options = await batch.options(web);
            expect(options.at(-1)).toBe(TEXT.noHigh);
            expect(options.slice(0, -1).sort()).toEqual(['fig1-high.png', 'fig2-high.png']);
        }
        await batch.choose('fig1-web.png', 'fig1-high.png');
        await expect.poll(() => batch.options('fig2-web.png')).toEqual(['fig2-high.png', TEXT.noHigh]);
        await batch.choose('fig2-web.png', 'fig2-high.png');
        await batch.link();
        await media.expectPair('fig1-web.png', 'fig1-high.png');
        await media.expectPair('fig2-web.png', 'fig2-high.png');

        // The web file's details copied in a batch link (Rule 3c).
        meta = await media.openMetadata('fig2-high.png');
        await expect(meta.box('Caption')).toHaveValue('Batch caption');
        await meta.cancel();

        // One row unlinked (Rule 3b).
        batch = await media.openBatch();
        await expect(batch.chosen('fig1-web.png')).toHaveText('fig1-high.png');
        await expect(batch.chosen('fig2-web.png')).toHaveText('fig2-high.png');
        await batch.choose('fig2-web.png', TEXT.noHigh);
        await batch.link();
        await media.expectAlone('fig2-web.png');
        await media.expectAlone('fig2-high.png');
        await media.expectPair('fig1-web.png', 'fig1-high.png');

        // Control: linking never copies the name (Rule 3c).
        meta = await media.openMetadata('fig1-high.png');
        await expect(meta.nameBox()).toHaveValue('fig1-high.png');
        await meta.cancel();
    });

    test('S3: edit and delete media files', async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s3', testInfo);
        const spare = `${tag}x`;
        const {manager, author} = await seedJournal(ojsApi, tag, {extra: [user(spare, 'Xena', 'Spare', ['author'])]});
        const [submission, control] = await Promise.all([
            ojsApi.createSubmission({
                tag,
                context: tag,
                submitter: author,
                decisions: PRODUCTION,
                mediaFiles: [
                    {file: 'figure.png', pair: 'p'},
                    {file: 'profile-image-400.png', resolution: 'high_resolution', name: 'figure-large.png', pair: 'p'},
                    {file: 'not-an-image.txt', genre: STYLESHEET, name: 'article.css'},
                ],
            }),
            ojsApi.createSubmission({tag: `${tag}c`, context: tag, submitter: spare}),
        ]);
        const {page, frame, media, dialogs} = await pageAs(asUser, manager, tag);

        // "Edit Metadata" on an image: the name with its help, then the
        // four artwork fields, each empty (Fields, the "Edit Metadata"
        // window). The bell is noted first.
        await frame.gotoEditorial(submission.submissionId);
        const bellBefore = await bellCount(frame);
        await media.openFromMenu();
        await media.expectPair('figure.png', 'figure-large.png');
        let meta = await media.openMetadata('figure.png');
        await meta.expectFieldLabels([TEXT.nameLabel, ...TEXT.artworkFields]);
        await expect(meta.help(TEXT.nameLabel)).toHaveText(TEXT.nameHelp);
        await expect(meta.nameBox()).toHaveValue('figure.png');
        for (const field of TEXT.artworkFields) {
            await expect(meta.box(field)).toHaveValue('');
        }

        // An empty name: refused under the box, nothing sent, the window
        // stays (Rule 4a).
        await meta.nameBox().fill('');
        expect(await meta.saveRefused()).toBe(0);

        // Leaving the window with a change: "Close" asks, "No" keeps both
        // values; "Cancel" asks again, "Yes" closes; nothing saved (Rule 6).
        await meta.type(TEXT.nameLabel, 'figure-1.png');
        await meta.type('Caption', 'Figure 1');
        await meta.pressExpectingWarning(meta.closeButton());
        await meta.answerNo();
        await expect(meta.nameBox()).toHaveValue('figure-1.png');
        await expect(meta.box('Caption')).toHaveValue('Figure 1');
        await meta.pressExpectingWarning(meta.cancelButton());
        await meta.answerYes();
        // Until a reload the list shows the typed name (T-ojs-1, not
        // asserted): the page is opened again before the window.
        await media.open(submission.submissionId, submission.publicationId);
        meta = await media.openMetadata('figure.png');
        await expect(meta.nameBox()).toHaveValue('figure.png');
        await expect(meta.box('Caption')).toHaveValue('');

        // "Save": the window closes, the row reads "figure-1.png" (Rule 4).
        await meta.type(TEXT.nameLabel, 'figure-1.png');
        await meta.type('Caption', 'Figure 1');
        await meta.submit();
        await expect(media.nameCell('figure-1.png')).toBeVisible();
        await expect(media.nameCell('figure.png')).toHaveCount(0);

        // The counterpart's shared details, both ways; each keeps its name
        // (Rule 4b).
        meta = await media.openMetadata('figure-large.png');
        await expect(meta.box('Caption')).toHaveValue('Figure 1');
        await expect(meta.nameBox()).toHaveValue('figure-large.png');
        await meta.type('Credit', 'Photo: Ana Silva');
        await meta.submit();
        meta = await media.openMetadata('figure-1.png');
        await expect(meta.box('Credit')).toHaveValue('Photo: Ana Silva');
        await expect(meta.nameBox()).toHaveValue('figure-1.png');
        await meta.cancel();

        // A stylesheet's window: the name alone (Fields).
        meta = await media.openMetadata('article.css');
        await meta.expectFieldLabels([TEXT.nameLabel]);
        await expect(meta.nameBox()).toHaveValue('article.css');
        await meta.cancel();

        // "More Information": the file's "History" lists the metadata line
        // (Actors row 3; Side effects).
        await media.openMoreInformation('figure-1.png');
        const info = new InformationCenter(page, 'figure-1.png');
        await info.expectOpen();
        await info.expectTab('History');
        await info.expectHistoryLoaded();
        await expect
            .poll(() => info.historyEvents())
            .toContain(`The metadata for file "figure-1.png" was edited by ${manager}.`);
        await info.close();
        await pastCloseWindow(page);

        // "Delete File", then "Cancel": the dialog's title, question and
        // buttons; the pair stays (Rule 5).
        let dialog = await media.openDelete('figure-large.png');
        await expect(dialog).toContainText(mediaDeleteQuestion('figure-large.png'));
        await expect(dialog.locator('strong')).toHaveText('"figure-large.png"');
        await expect(dialog.getByRole('button', {name: 'OK', exact: true})).toBeVisible();
        await expect(dialog.getByRole('button', {name: 'Cancel', exact: true})).toBeVisible();
        await media.cancelDelete();
        await media.expectPair('figure-1.png', 'figure-large.png');

        // "Delete File", then "OK": the row goes, the counterpart stands
        // alone (Rule 5).
        dialog = await media.openDelete('figure-large.png');
        expect((await media.confirmDelete()).status()).toBe(200);
        await expect(media.row('figure-large.png')).toHaveCount(0);
        await media.expectAlone('figure-1.png');
        await media.expectNames(['figure-1.png', 'article.css']);

        // The Activity Log: the metadata line and the delete line (Side
        // effects).
        const log = new ActivityLogWindow(page, frame);
        await log.open();
        const events = (await log.historyLines()).map((line) => line.event);
        await log.close();
        expect(events).toContain(`The metadata for file "figure-1.png" was edited by ${manager}.`);
        expect(events).toContain(`A file "figure-large.png" was deleted for submission ${submission.submissionId} by ${manager}.`);

        // No email, no notice: the bell unchanged; no mail to the journal's
        // accounts, bounded by the one mail the test sends itself, a
        // "Notify" to the spare (Side effects; A8).
        const bellAfter = await (async () => {
            await frame.gotoEditorial(submission.submissionId);
            return bellCount(frame);
        })();
        expect(bellAfter).toBe(bellBefore);
        const notify = new PublicationScreen(page, tag);
        await notify.gotoWorkflow(control.submissionId);
        await notify.openStage('Submission');
        await notify.notifyParticipant('Xena Spare', `<p>Control ${tag}</p>`);
        const afterControl = {to: mailOf(spare), subject: NOTIFY_SUBJECT, contains: `Control ${tag}`};
        await pkpMail.expectNone({to: mailOf(manager), afterControl});
        await pkpMail.expectNone({to: mailOf(author), afterControl});

        // Leaving the page with a change: the browser's "Leave site?"
        // (Rule 6).
        await media.open(submission.submissionId, submission.publicationId);
        meta = await media.openMetadata('figure-1.png');
        await meta.type('Credit', 'Draft credit');
        const asked = dialogs.seen.length;
        await page.goto(`/index.php/${tag}`);
        expect(dialogs.typesSince(asked)).toEqual(['beforeunload']);
        await expect(page).toHaveURL(new RegExp(`/index\\.php/${tag}/?$`));

        // Control: with no window open the browser leaves at once (Rule 6).
        await media.open(submission.submissionId, submission.publicationId);
        await expect(media.nameCell('figure-1.png')).toBeVisible();
        const quiet = dialogs.seen.length;
        await page.goto(`/index.php/${tag}`);
        await expect(page).toHaveURL(new RegExp(`/index\\.php/${tag}/?$`));
        expect(dialogs.typesSince(quiet)).toEqual([]);
    });

    test('S4: an assigned Section Editor and Layout Editor, and the Author', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s4', testInfo);
        const sectionEditor = `${tag}se`;
        const layoutEditor = `${tag}le`;
        const {author} = await seedJournal(ojsApi, tag, {
            roles: {layoutEditor: {permitMetadataEdit: true}},
            extra: [
                user(sectionEditor, 'Sara', 'Section', ['sectionEditor']),
                user(layoutEditor, 'Leo', 'Layout', ['layoutEditor']),
            ],
        });
        const submission = await ojsApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            decisions: PRODUCTION,
            participants: [
                {username: sectionEditor, role: 'sectionEditor'},
                {username: layoutEditor, role: 'layoutEditor'},
            ],
            mediaFiles: [{file: 'figure.png'}],
        });

        // The Section Editor: both buttons, the full row menu; an upload at
        // "High resolution" (Actors row 2).
        const se = await pageAs(asUser, sectionEditor, tag);
        await se.frame.gotoEditorial(submission.submissionId);
        await se.media.openFromMenu();
        await expect(se.media.batchButton()).toBeVisible();
        await expect(se.media.addButton()).toBeVisible();
        expect(await se.media.menuOffers('figure.png')).toEqual(TEXT.menuFull);
        await se.media.addFiles([
            {file: fixture('profile-image-400.png'), name: 'profile-image-400.png', mediaType: IMAGE, resolution: TEXT.high},
        ]);
        await se.media.expectType('profile-image-400.png', [IMAGE, TEXT.highBadge]);

        // The Layout Editor: the same buttons and menu; a manual link
        // (Actors row 2; Settings bullet 4).
        const le = await pageAs(asUser, layoutEditor, tag);
        await le.frame.gotoEditorial(submission.submissionId);
        await le.media.openFromMenu();
        await expect(le.media.batchButton()).toBeVisible();
        await expect(le.media.addButton()).toBeVisible();
        expect(await le.media.menuOffers('figure.png')).toEqual(TEXT.menuFull);
        const link = await le.media.openManualLink('figure.png');
        await link.choose('profile-image-400.png');
        await link.submit();
        await le.media.expectPair('figure.png', 'profile-image-400.png');

        // The Author, from "View" on My Submissions: the pair, with no
        // buttons and no "…" on any row (Actors rows 1–2).
        const au = await pageAs(asUser, author, tag);
        const mySubmissions = new MySubmissionsPage(au.page, tag);
        await mySubmissions.goto();
        const row = await mySubmissions.findRowByTag(tag);
        await au.frame.openFromRow(row, submission.submissionId);
        await au.media.openFromMenu();
        await au.media.expectNames(['figure.png', 'profile-image-400.png']);
        await au.media.expectPair('figure.png', 'profile-image-400.png');
        await expect(au.media.batchButton()).toHaveCount(0);
        await expect(au.media.addButton()).toHaveCount(0);
        await expect(au.media.rowButtons('figure.png')).toHaveCount(0);
        await expect(au.media.rowButtons('profile-image-400.png')).toHaveCount(0);

        // The Author's download (Actors row 1; Fields, File Name).
        const got = await au.media.download('figure.png');
        expect(got.newTab).toBe(true);
        expect(got.status).toBe(200);
        expect(got.disposition).toMatch(/attachment/);

        // Control: the Section Editor's page, opened the same way, shows
        // both buttons and each row's "…" (Actors row 2).
        await se.frame.gotoEditorial(submission.submissionId);
        await se.media.openFromMenu();
        await se.media.expectNames(['figure.png', 'profile-image-400.png']);
        await expect(se.media.batchButton()).toHaveCount(1);
        await expect(se.media.addButton()).toHaveCount(1);
        await expect(se.media.menuButton('figure.png')).toHaveCount(1);
        await expect(se.media.menuButton('profile-image-400.png')).toHaveCount(1);
    });

    test('S5: a published version\'s media files and a new version', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s5', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag, {issues: [{...ISSUE, published: true}]});
        const submission = await ojsApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            decisions: PRODUCTION,
            mediaFiles: [
                {file: 'figure.png', pair: 'p'},
                {file: 'profile-image-400.png', resolution: 'high_resolution', name: 'figure-large.png', pair: 'p'},
                {file: 'not-an-image.png', name: 'extra.png'},
            ],
            published: true,
            issue: ISSUE,
        });
        const {page, frame, media} = await pageAs(asUser, manager, tag);

        // The published version's page: both buttons and the full menu on
        // every row (Rule 8).
        await frame.gotoEditorial(submission.submissionId);
        await media.openFromMenu();
        await media.expectNames(['figure.png', 'figure-large.png', 'extra.png']);
        await expect(media.batchButton()).toBeVisible();
        await expect(media.addButton()).toBeVisible();
        for (const name of ['figure.png', 'figure-large.png', 'extra.png']) {
            expect(await media.menuOffers(name)).toEqual(TEXT.menuFull);
        }

        // A change on the published version saves (Rule 8).
        let meta = await media.openMetadata('figure.png');
        await meta.type('Caption', 'Figure 1');
        await meta.submit();
        meta = await media.openMetadata('figure.png');
        await expect(meta.box('Caption')).toHaveValue('Figure 1');
        await meta.cancel();

        // The new version's copies: the pair, "High resolution", the lone
        // file, all "Image", the caption kept (Rule 9).
        const publish = new PublishScreen(page, tag);
        const versionDialog = await publish.openCreateVersionDialog();
        const newPublicationId = await publish.confirmVersionDialog(versionDialog);
        await media.open(submission.submissionId, newPublicationId);
        await media.expectNames(['figure.png', 'figure-large.png', 'extra.png']);
        await media.expectPair('figure.png', 'figure-large.png');
        await media.expectAlone('extra.png');
        await media.expectType('figure.png', [IMAGE]);
        await media.expectType('figure-large.png', [IMAGE, TEXT.highBadge]);
        await media.expectType('extra.png', [IMAGE]);
        meta = await media.openMetadata('figure.png');
        await expect(meta.box('Caption')).toHaveValue('Figure 1');
        await meta.cancel();

        // Changing the copies: a rename, an unlink, a delete (Rules 3a, 5, 9).
        meta = await media.openMetadata('figure.png');
        await meta.type(TEXT.nameLabel, 'figure-v2.png');
        await meta.submit();
        const link = await media.openManualLink('figure-large.png');
        await link.choose(TEXT.noWeb);
        await link.submit();
        await media.openDelete('extra.png');
        expect((await media.confirmDelete()).status()).toBe(200);
        await media.expectNames(['figure-v2.png', 'figure-large.png']);
        await media.expectAlone('figure-v2.png');
        await media.expectAlone('figure-large.png');
        await expect(media.row('extra.png')).toHaveCount(0);

        // The earlier version untouched (Rule 9).
        await media.open(submission.submissionId, submission.publicationId);
        await media.expectNames(['figure.png', 'figure-large.png', 'extra.png']);
        await media.expectPair('figure.png', 'figure-large.png');

        // Control: the published version's "extra.png" still downloads
        // (Rule 9).
        const got = await media.download('extra.png');
        expect(got.newTab).toBe(true);
        expect(got.status).toBe(200);
        expect(got.disposition).toMatch(/attachment/);
    });

    test('S6: a component with file variants and supplementary details', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s6', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag, {
            components: {[MULTIMEDIA]: {fileVariants: true, metadata: 'supplementary'}},
        });
        const submission = await ojsApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            decisions: PRODUCTION,
            mediaFiles: [
                {file: 'replacement.pdf', genre: MULTIMEDIA, name: 'clip-web.pdf'},
                {file: 'profile-image-400.png', resolution: 'high_resolution', name: 'figure-large.png'},
            ],
        });
        const {frame, media} = await pageAs(asUser, manager, tag);

        // "High resolution" for "Multimedia" (Settings bullet 2; Rule 2a).
        await frame.gotoEditorial(submission.submissionId);
        await media.openFromMenu();
        await media.expectNames(['clip-web.pdf', 'figure-large.png']);
        const upload = await media.openUpload();
        await upload.chooseFiles([fixture('not-an-image.txt')]);
        await upload.expectUploaded('not-an-image.txt');
        await upload.chooseMediaType('not-an-image.txt', MULTIMEDIA);
        await expect(upload.resolutionSelect('not-an-image.txt')).toBeEnabled();
        await upload.chooseResolution('not-an-image.txt', TEXT.high);
        await upload.submit();
        await expect(media.nameCell('not-an-image.txt')).toBeVisible();
        await media.expectType('not-an-image.txt', [MULTIMEDIA, TEXT.highBadge]);

        // "Manually Link Media" on a "Multimedia" row: the Multimedia file
        // offered, the Image not (Settings bullet 2; Rule 3a).
        expect(await media.menuOffers('clip-web.pdf')).toEqual(TEXT.menuFull);
        const link = await media.openManualLink('clip-web.pdf');
        expect(await link.options()).toEqual(['not-an-image.txt', TEXT.noHigh]);
        await link.cancel();

        // "Batch Link Media": one row, the same list; the link (Settings
        // bullet 2; Rule 3b).
        const batch = await media.openBatch();
        await expect(batch.webNames()).toHaveText(['clip-web.pdf']);
        expect(await batch.options('clip-web.pdf')).toEqual(['not-an-image.txt', TEXT.noHigh]);
        await batch.choose('clip-web.pdf', 'not-an-image.txt');
        await batch.link();
        await media.expectPair('clip-web.pdf', 'not-an-image.txt');

        // Supplementary details: the eight fields, "Date" a date picker;
        // saved and read back (Settings bullet 3; Fields).
        let meta = await media.openMetadata('clip-web.pdf');
        await meta.expectFieldLabels([TEXT.nameLabel, ...TEXT.supplementaryFields]);
        await expect(meta.box('Date')).toHaveAttribute('type', 'date');
        await meta.type('Description', 'Interview recording');
        await meta.type('Date', '2026-01-15');
        await meta.submit();
        meta = await media.openMetadata('clip-web.pdf');
        await expect(meta.box('Description')).toHaveValue('Interview recording');
        await expect(meta.box('Date')).toHaveValue('2026-01-15');
        await meta.cancel();

        // Control: the image's window holds the artwork fields and none of
        // the eight (Settings bullet 3).
        meta = await media.openMetadata('figure-large.png');
        await meta.expectFieldLabels([TEXT.nameLabel, ...TEXT.artworkFields]);
        await meta.cancel();
    });

    test('S7: what readers see', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s7', testInfo);
        const reader = `${tag}rd`;
        const {manager, author} = await seedJournal(ojsApi, tag, {
            issues: [{...ISSUE, published: true}],
            extra: [user(reader, 'Rhea', 'Reader', ['reader'])],
        });
        const submission = await ojsApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            decisions: PRODUCTION,
            galleys: [{label: 'HTML', locale: 'en', file: 'article.html'}],
            mediaFiles: [{file: 'profile-image-400.png', resolution: 'high_resolution', name: 'figure.png'}],
            published: true,
            issue: ISSUE,
        });
        const rd = await pageAs(asUser, reader, tag);
        const jm = await pageAs(asUser, manager, tag);

        // A high-resolution file alone: the Reader, signed in, opens the
        // "HTML" galley; the image does not load (Side effects).
        await rd.page.goto(`/index.php/${tag}/article/view/${submission.submissionId}`);
        const galleyLink = readerGalleyLinks(rd.page).filter({hasText: /^\s*HTML\s*$/});
        await expect(galleyLink).toBeVisible({timeout: 30_000});
        await galleyLink.click();
        await expect(rd.page).toHaveURL(new RegExp(`/article/view/${submission.submissionId}/\\d+`));
        await expect(rd.page.frameLocator('iframe').first().locator('h1')).toHaveText('Article', {timeout: 30_000});
        expect(await figureWidth(rd.page)).toBe(0);

        // A web-resolution file added on the published version: a second
        // "figure.png", without "High resolution" (Rules 2, 8).
        await jm.frame.gotoEditorial(submission.submissionId);
        await jm.media.openFromMenu();
        await jm.media.addFiles([{file: fixture('figure.png'), name: 'figure.png', mediaType: IMAGE, resolution: TEXT.web}]);
        await expect(jm.media.row('figure.png')).toHaveCount(2);
        await expect(jm.media.row({name: 'figure.png', high: false})).toHaveCount(1);
        await expect(jm.media.row({name: 'figure.png', high: true})).toHaveCount(1);

        // The reader, at once: the image shows (Rule 8; Side effects).
        await rd.page.reload();
        expect(await figureWidth(rd.page)).toBe(120);

        // A rename: the image no longer loads (Side effects).
        let meta = await jm.media.openMetadata({name: 'figure.png', high: false});
        await meta.type(TEXT.nameLabel, 'figure-web.png');
        await meta.submit();
        await expect(jm.media.nameCell('figure-web.png')).toBeVisible();
        await rd.page.reload();
        expect(await figureWidth(rd.page)).toBe(0);

        // Control: renamed back, the image shows again (Side effects).
        meta = await jm.media.openMetadata('figure-web.png');
        await meta.type(TEXT.nameLabel, 'figure.png');
        await meta.submit();
        await expect(jm.media.row('figure.png')).toHaveCount(2);
        await rd.page.reload();
        expect(await figureWidth(rd.page)).toBe(120);
    });
});
