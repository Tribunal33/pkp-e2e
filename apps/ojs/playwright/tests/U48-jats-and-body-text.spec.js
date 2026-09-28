// @ts-check
/**
 * @file playwright/tests/U48-jats-and-body-text.spec.js
 *
 * JATS & Body Text — OJS suite, one test per canonical scenario the spec
 * runs on OJS (S1–S8; S9 is the press's and the preprint server's
 * absence, in the OMP and OPS trees).
 * Spec: docs/specs/U48-jats-and-body-text.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's "Left out" list is the record of everything else):
 * - A1 🐞: S3's Layout Editor is offered the tick box; nothing asserts it
 *   either way, and no role that may not edit presses it.
 * - A2 🐞: S3 presses the "Save" the Layout Editor is offered, as the
 *   scenario does; only the refusal and the unchanged text are asserted,
 *   never that the button is offered to that role.
 * - A7 🐞: S1 reads the galley's text inside the XML's body, never its
 *   paragraphs or markup.
 * - A11 🐞: S3's Funding Coordinator never presses "Download".
 * - A12 🐞: a published version's "Upload" and "Delete" are never read
 *   (S4 and S6 use the published page's box and XML only).
 * - A14 🐞: "Unsaved Changes" is never read on a never-saved Body Text's
 *   arrival (S2, S3); S2 reads it only after its first save.
 * - A16 🐞: S2 reads each reference's "Cite", never whether it is greyed.
 * - A19 🐞: S8 reads the download after signing in, never where the tab
 *   stays.
 * - A3, A4 ❓: parked. A5, A6, A8–A10, A13, A15, A17, A18: not on these
 *   scenarios' paths. OMP1: the press's, in that tree.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only. S2, S3, S5 and S6 run on publicknowledge on their own
 * scratch submissions (`manager.maya`, submitter `author.alex`; S3's
 * `layouteditor.leo` and `assistant.rita` as participants, S5's
 * `author.bea` and `reader.rosa`); S1, S4, S7 and S8 run on scratch
 * journals with throwaway accounts (the username twice as password; S4's
 * "no toast" is read on a page of an account no other test signs in as,
 * patterns.md parallel lesson 2), as footnote v
 * says: `abstract`, `citationsRaw`, `galleys[]`, `files[]`, `decisions`,
 * `participants[]`, `published`, `jats` (`file`, `makePublic`) and the
 * context's `plugins` (S7) and `restrictArticleAccess` (S8). No key makes
 * a second version: S6 uses "Create New Version" (U49's opener).
 *
 * Every absence is read settled and paired with a positive control taken
 * the same way (M4, M6): the JATS page's buttons are read as one exact
 * list, S1's mailbox silence is bounded by a "Notify" the test sends to a
 * spare account of its own journal (A8). Browser dialogs are recorded and
 * accepted on every page. Downloads are read from the browser's own
 * download (a typed address that downloads makes `goto()` throw "Download
 * is starting", ccK2). Waits are web-first or bounded by the screen's own
 * answer (A5). Everything runs in the parallel `ojs` project.
 */
const path = require('path');
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {ActivityLogWindow} = require('../../../../shared/playwright/pages/ActivityLogPages.js');
const {FileList, recordBrowserDialogs} = require('../../../../shared/playwright/pages/SubmissionFilesPages.js');
const {MediaFileManager} = require('../../../../shared/playwright/pages/MediaFilesPages.js');
const {MySubmissionsPage} = require('../../../../shared/playwright/pages/MySubmissionsPage.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {pastCloseWindow} = require('../../../../shared/playwright/pages/IdentifiersPages.js');
const {captureDownload} = require('../../../../shared/playwright/pages/SubmissionFilesPages.js');
const {
    JATS_TEXT: TEXT,
    JatsPage,
    BodyTextPage,
    SendToTextEditorWindow,
    articleLinks,
    jatsLink,
    jatsLinkNumbers,
    openArticle,
    pressJatsLink,
    gotoDownload,
    gotoText,
    statsArticleColumns,
    serverStamp,
    browserStamp,
    readDownload,
} = require('../../../../shared/playwright/pages/JatsBodyTextPages.js');
const {PublicationScreen} = require('../pages/PublicationMetadataPages.js');
const {PublishScreen} = require('../pages/PublishSchedulePages.js');

const JOURNAL = 'publicknowledge';
const MANAGER = 'manager.maya';
const AUTHOR = 'author.alex';
const PRODUCTION = ['sendExternalReview', 'accept', 'sendToProduction'];
const REF_ALPHA = 'Alpha, A. (2020). First reference.';
const REF_BETA = 'Beta, B. (2021). Second reference.';
const FIXTURE_TITLE = 'A JATS fixture article';
/** What article.docx (a heading, two paragraphs, a figure with its caption) imports as, and nothing else. */
const IMPORTED_TEXT =
    /^K3 Imported Heading K3 imported paragraph before the figure\.[\s\S]*K3 figure caption[\s\S]*K3 imported paragraph after the figure\.$/;
const NOTIFY_SUBJECT = 'Discussion (Submission)';
const FILES = path.join(__dirname, '..', 'fixtures', 'files');
const fixture = (name) => path.join(FILES, name);

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u48${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: mailOf(username), roles};
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
 * A page as `username`: the workflow frame of `contextPath`, the two page
 * objects and a recorder of every browser dialog (accepted).
 */
async function pageAs(asUser, username, contextPath) {
    const page = await (await asUser(username)).newPage();
    const frame = new WorkflowPage(page, contextPath);
    return {
        page,
        frame,
        jats: new JatsPage(page, frame),
        body: new BodyTextPage(page, frame),
        dialogs: recordBrowserDialogs(page),
    };
}

/** A signed-out visitor's page (an explicit empty state, patterns.md lesson 8). */
async function visitorPage(browser, baseURL) {
    const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
    return context.newPage();
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
 * No toast at the top right: the status area is there (its own control)
 * and holds no `.pkpNotification`.
 */
async function expectNoNotice(page) {
    await expect(page.locator('.app__notifications')).toBeAttached();
    await expect(page.locator('.app__notifications .pkpNotification')).toHaveCount(0);
}

/** Whitespace folded, ends trimmed. */
const flat = (text) => (text || '').replace(/\s+/g, ' ').trim();

/** The "Last Modification at {date} by {username}" line, parsed. */
function modificationLine(text) {
    const match = flat(text).match(/^Last Modification at (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) by (\S+)$/);
    if (!match) {
        throw new Error(`the line reads "${text}"`);
    }
    return {date: match[1], username: match[2]};
}

/** The History lines whose event names `name` (in quotes). */
async function historyNaming(page, frame, name) {
    const log = new ActivityLogWindow(page, frame);
    await log.open();
    const lines = (await log.historyLines()).filter((line) => line.event.includes(`"${name}"`));
    await log.close();
    await pastCloseWindow(page);
    return lines;
}

test.describe('JATS & Body Text', () => {
    test('S1: the generated JATS XML, an upload and a delete', {tag: '@smoke'}, async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s1', testInfo);
        const spare = `${tag}x`;
        const {manager, author} = await seedJournal(ojsApi, tag, {extra: [user(spare, 'Xena', 'Spare', ['author'])]});
        const [submission, control] = await Promise.all([
            ojsApi.createSubmission({
                tag,
                context: tag,
                submitter: author,
                title: 'JATS scenario article',
                abstract: '<p>Two points:</p><ul><li>First point</li><li>Second point</li></ul>',
                citationsRaw: [REF_ALPHA, REF_BETA],
                decisions: PRODUCTION,
                galleys: [{label: 'HTML', file: 'article.html'}],
            }),
            ojsApi.createSubmission({tag: `${tag}c`, context: tag, submitter: spare}),
        ]);
        const {page, frame, jats} = await pageAs(asUser, manager, tag);

        // The generated XML: the heading, the box "JATS XML" with "Upload",
        // "Download" and the unticked box on the heading's right, no "More
        // Information", no "Delete"; the XML below, the generated line
        // under it (Fields; Rule 1).
        await frame.gotoEditorial(submission.submissionId);
        const bell = await bellCount(frame);
        await jats.openFromMenu();
        await expect(frame.heading()).toHaveText('Publication: JATS XML');
        await expect(jats.boxHeading()).toHaveText(TEXT.boxHeading);
        await jats.expectButtons(['Upload', 'Download']);
        await expect(jats.panel().locator('.filePanel__header').getByText(TEXT.makePublic, {exact: true})).toBeVisible();
        await expect(jats.makePublicBox()).not.toBeChecked();
        const headerBottom = await jats.panel().locator('.filePanel__header').boundingBox();
        const xmlTop = await jats.xml().boundingBox();
        expect(xmlTop?.y ?? 0).toBeGreaterThanOrEqual((headerBottom?.y ?? 0) + (headerBottom?.height ?? 0) - 1);
        await expect(jats.line()).toHaveText(TEXT.generatedLine);

        // What the XML carries: the journal's name, the title, the
        // abstract's two points as a list, both references at the end
        // (Rule 2); the HTML galley's text in a body part (Rule 2a).
        let xml = await jats.xmlText();
        expect(xml).toContain(`Scratch context ${tag}`);
        expect(xml).toContain('JATS scenario article');
        expect(xml).toMatch(/<list[^>]*>[\s\S]*First point[\s\S]*Second point[\s\S]*<\/list>/);
        expect(xml).toMatch(/<ref-list>[\s\S]*Alpha, A\. \(2020\)\. First reference\.[\s\S]*Beta, B\. \(2021\)\. Second reference\.[\s\S]*<\/ref-list>\s*<\/back>/);
        expect(xml).toMatch(/<body>[\s\S]*A small HTML file[\s\S]*<\/body>/);

        // A metadata change shows the next time the page opens (Rule 1).
        await frame.selectPage('Title & Abstract');
        const metadata = new PublicationScreen(page, tag);
        await metadata.setRichText('titleAbstract-title-control-en', 'Revised JATS article');
        await metadata.save();
        await jats.openFromMenu();
        await expect(jats.xml()).toContainText('Revised JATS article');

        // "Download" of the generated XML: "jats-{n}-{date}-{time}.xml" by
        // the browser's clock (Rule 7).
        let before = await browserStamp(page);
        let saved = await jats.download();
        let after = await browserStamp(page);
        let name = saved.name.match(/^jats-(\d+)-(\d{8}-\d{6})\.xml$/);
        expect(name, saved.name).not.toBeNull();
        expect(Number(name?.[1])).toBe(submission.publicationId);
        expect(name?.[2] >= before && name?.[2] <= after, `${name?.[2]} between ${before} and ${after}`).toBe(true);

        // "Upload": the toast, the file's XML, the line with the server's
        // time and the manager's username, "More Information" and "Delete"
        // (Rule 3; Fields, the line under the XML).
        const uploadFrom = serverStamp(new Date(Date.now() - 2000));
        const uploaded = await jats.upload(fixture('article.xml'));
        const uploadTo = serverStamp(new Date(Date.now() + 2000));
        expect(uploaded.ok()).toBe(true);
        await expect(page.locator('.app__notifications .pkpNotification').filter({hasText: TEXT.uploaded})).toBeVisible();
        await expect(jats.xml()).toContainText(FIXTURE_TITLE);
        const line = modificationLine(await jats.line().innerText());
        expect(line.username).toBe(manager);
        expect(line.date >= uploadFrom && line.date <= uploadTo, `${line.date} between ${uploadFrom} and ${uploadTo}`).toBe(true);
        await jats.expectButtons(['Upload', 'More Information', 'Delete', 'Download']);

        // The uploaded file's "Download" and "More Information" (Rules 6, 7).
        saved = await jats.download();
        expect(saved.name).toBe('article.xml');
        const center = await jats.openMoreInformation('article.xml');
        await center.expectOpen();
        await jats.closeMoreInformation(center);

        // "Delete", then "Cancel": the window's text and buttons; the file
        // stays (Rule 5).
        let dialog = await jats.openDelete();
        await expect(dialog).toContainText(TEXT.deleteTitle);
        await expect(dialog).toContainText(TEXT.deleteMessage);
        await expect(dialog.getByRole('button', {name: TEXT.deleteButton, exact: true})).toBeVisible();
        await expect(dialog.getByRole('button', {name: 'Cancel', exact: true})).toBeVisible();
        await jats.cancelDelete();
        await expect(jats.xml()).toContainText(FIXTURE_TITLE);
        await jats.expectButtons(['Upload', 'More Information', 'Delete', 'Download']);

        // "Delete JATS File": the generated XML again, with the revised
        // title, the generated line; "More Information" and "Delete" gone
        // (Rules 1, 5).
        await jats.openDelete();
        const deleted = await jats.confirmDelete();
        expect(deleted.ok()).toBe(true);
        await expect(jats.xml()).toContainText('Revised JATS article');
        await expect(jats.xml()).not.toContainText(FIXTURE_TITLE);
        await expect(jats.line()).toHaveText(TEXT.generatedLine);
        await jats.expectButtons(['Upload', 'Download']);

        // The History: lines naming "article.xml" and the manager, for the
        // upload and for the delete (Side effects).
        const lines = await historyNaming(page, frame, 'article.xml');
        const history = lines.map((l) => `${l.user} | ${l.event}`);
        expect(history.some((l) => /^Mona Manager \| Revision "article\.xml" was uploaded for file \d+\.$/.test(l)), JSON.stringify(history)).toBe(true);
        expect(history).toContain(`Mona Manager | A file "article.xml" was deleted for submission ${submission.submissionId} by ${manager}.`);

        // No notice: the Tasks bell's number unchanged (Side effects).
        expect(await bellCount(frame)).toBe(bell);

        // No email about any of it: bounded by the one mail the test sends
        // itself the same way, a "Notify" to the spare (Side effects; A8).
        const notify = new PublicationScreen(page, tag);
        await notify.gotoWorkflow(control.submissionId);
        await notify.openStage('Submission');
        await notify.notifyParticipant('Xena Spare', `<p>Control ${tag}</p>`);
        const afterControl = {to: mailOf(spare), subject: NOTIFY_SUBJECT, contains: `Control ${tag}`};
        await pkpMail.expectNone({to: mailOf(author), afterControl});
        await pkpMail.expectNone({to: mailOf(manager), afterControl});

        // Control: "Download" saves a generated file again, not
        // "article.xml" (Rules 5, 7).
        await jats.open(submission.submissionId, submission.publicationId);
        before = await browserStamp(page);
        saved = await jats.download();
        after = await browserStamp(page);
        name = saved.name.match(/^jats-(\d+)-(\d{8}-\d{6})\.xml$/);
        expect(name, saved.name).not.toBeNull();
        expect(name?.[2] >= before && name?.[2] <= after).toBe(true);
        xml = saved.text;
        expect(xml).toContain('Revised JATS article');
    });

    test('S2: write, save and import the Body Text', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s2', testInfo);
        const submission = await ojsApi.createSubmission({
            tag,
            context: JOURNAL,
            submitter: AUTHOR,
            title: `Body text ${tag}`,
            citationsRaw: [REF_ALPHA, REF_BETA],
            files: [{file: 'article.docx'}],
            decisions: PRODUCTION,
        });
        const {page, frame, body} = await pageAs(asUser, MANAGER, JOURNAL);

        // The page: heading, an empty editor, "Bold" and "Italic" greyed,
        // "Save" and "Fullscreen" (Fields; Rule 14).
        await frame.gotoEditorial(submission.submissionId);
        await body.openFromMenu();
        await expect(frame.heading()).toHaveText('Publication: Body Text');
        await expect.poll(() => body.editorText(), {timeout: 30_000}).toBe('');
        await expect(body.toolbarButton('Bold')).toBeDisabled();
        await expect(body.toolbarButton('Italic')).toBeDisabled();
        await expect(body.saveButton()).toHaveText(TEXT.save);
        await expect(body.fullscreenButton()).toHaveText(TEXT.fullscreen);

        // "References": open, the hint, both references, each with "Cite"
        // (Fields; Rule 17).
        await expect(body.section('references')).toHaveAttribute('open', '');
        await expect(body.sectionHeading('references')).toHaveText(TEXT.references);
        await expect(body.referencesHint()).toHaveText(TEXT.dragHint);
        await expect(body.referenceItems()).toHaveCount(2);
        await expect(body.referenceItems().nth(0)).toContainText(REF_ALPHA);
        await expect(body.referenceItems().nth(1)).toContainText(REF_BETA);
        for (let i = 0; i < 2; i++) {
            await expect(body.citeButton(body.referenceItems().nth(i))).toHaveText(TEXT.cite);
        }

        // The first save: typed in the editor, the toolbar wakes (a click
        // into the empty editor alone leaves it greyed, T-ojs-1); "Saved"
        // for a moment, then "Save"; no "Unsaved Changes" (Fields; Rule 15).
        await body.editor().click();
        await body.typeAtEnd('First sentence.');
        await expect(body.toolbarButton('Bold')).toBeEnabled();
        await expect(body.toolbarButton('Italic')).toBeEnabled();
        await body.saveExpectingSaved();
        await expect(body.unsavedBadge()).toBeHidden();

        // A change and its undo (Rule 15).
        await body.typeAtEnd('Z');
        await expect(body.unsavedBadge()).toBeVisible();
        await body.toolbarButton('Undo').click();
        await expect(body.unsavedBadge()).toBeHidden();
        await expect.poll(() => body.editorText()).toBe('First sentence.');

        // A citation: the first reference dragged after "First sentence.";
        // it is highlighted, the second is not (Rules 15, 17).
        await body.dragReference(body.referenceItems().first(), body.paragraphs().first());
        await expect(body.citations()).toHaveCount(1);
        await expect(body.unsavedBadge()).toBeVisible();
        await expect(body.referenceItems().nth(0)).toHaveClass(/\breference-highlight\b/);
        await expect(body.referenceItems().nth(1)).not.toHaveClass(/\breference-highlight\b/);

        // A figure: "Insert" › "Insert figure" › "figure.png" (Rule 22).
        const figure = await body.insertFigure(fixture('figure.png'));
        expect(figure.ok()).toBe(true);
        await expect(body.figures()).toHaveCount(1);
        await expect(body.figures().first()).toBeVisible();

        // "Fullscreen", and the Escape key back (Rule 18).
        const viewport = page.viewportSize();
        await body.fullscreenButton().click();
        await expect(body.fullscreenButton()).toHaveText(TEXT.exitFullscreen);
        await expect(body.root()).toHaveClass(/sciflow-body-text--fullscreen/);
        // The size settles a moment after the class (read 400 px high,
        // then the window's 720, in one run): polled.
        await expect
            .poll(async () => {
                const box = await body.root().boundingBox();
                return [Math.round(box?.x ?? -1), Math.round(box?.y ?? -1), Math.round(box?.width ?? 0), Math.round(box?.height ?? 0)];
            }, {timeout: 30_000})
            .toEqual([0, 0, viewport?.width, viewport?.height]);
        // lint-ok: escape Rule 18 claims the key; the fullscreen trap takes it in a document capture listener, before the workflow dialog
        await page.keyboard.press('Escape');
        await expect(body.fullscreenButton()).toHaveText(TEXT.fullscreen);
        await expect(body.root()).not.toHaveClass(/sciflow-body-text--fullscreen/);
        await expect(frame.heading()).toHaveText('Publication: Body Text');

        // Saved and reloaded: the text, the citation and the figure; no
        // "Unsaved Changes" (Rules 14, 15, 22).
        const stored = await body.save();
        expect(stored.ok()).toBe(true);
        await expect(body.unsavedBadge()).toBeHidden();
        await body.reload();
        await expect.poll(() => body.editorText()).toContain('First sentence.');
        await expect(body.citations()).toHaveCount(1);
        await expect(body.figures()).toHaveCount(1);
        await expect(body.unsavedBadge()).toBeHidden();

        // The "Media" page holds no "figure.png" (Rule 22).
        const media = new MediaFileManager(page, frame);
        await media.openFromMenu();
        await expect(media.noItems()).toBeVisible();
        await expect(media.rows()).toHaveCount(0);
        await expect(media.nameCell('figure.png')).toHaveCount(0);

        // "Send to Text Editor": the window, "Create New Version" first,
        // then the one version; that version, "Confirm" (Actors row 6).
        await frame.selectStage('Submission');
        const files = new FileList(page, frame, 'Submission Files');
        await files.choose(files.row('article.docx'), 'Send to Text Editor');
        const send = new SendToTextEditorWindow(page);
        await send.expectOpen();
        await expect(send.dialog()).toContainText(TEXT.sendQuestion);
        const options = await send.options();
        expect(options.map((o) => o.value)).toEqual(['create', String(submission.publicationId)]);
        expect(options[0].label).toBe(TEXT.createNewVersion);
        await send.chooseVersion(submission.publicationId);
        await body.watchImport();
        await send.confirm();

        // The import: the version's "Body Text" opens, the box above the
        // editor steps through its steps in order, then goes (Rule 20).
        await body.expectLoaded();
        await expect
            .poll(async () => {
                const steps = await body.importSteps();
                return steps.some((s) => s.includes('Converting')) && steps[steps.length - 1] === '';
            }, {timeout: 30_000})
            .toBe(true);
        await body.stopWatchingImport();
        const steps = (await body.importSteps()).filter(Boolean);
        for (const step of steps) {
            expect(step).toContain(TEXT.importing);
        }
        const firstAt = (label) => steps.findIndex((s) => s.includes(label));
        const order = TEXT.importSteps.map(firstAt);
        expect(order.every((i) => i >= 0), JSON.stringify(steps)).toBe(true);
        expect([...order].sort((a, b) => a - b), JSON.stringify(steps)).toEqual(order);
        await expect(body.importStatus()).toHaveCount(0);

        // What arrives: the Word file's heading, text and figure with its
        // caption replace what the editor held: "First sentence.", its
        // citation and the inserted figure are gone; "Unsaved Changes"
        // shows (Rule 20a).
        await expect
            .poll(() => body.editorText(), {timeout: 30_000})
            .toMatch(IMPORTED_TEXT);
        expect(await body.editorText()).not.toContain('First sentence.');
        await expect(body.figures()).toHaveCount(1);
        await expect(body.citations()).toHaveCount(0);
        await expect(body.unsavedBadge()).toBeVisible();

        // Control: after a reload without "Save" the saved text is back,
        // with its citation and figure, and the import does not run again
        // (Rules 20, 20a).
        await body.reload();
        await expect.poll(() => body.editorText(), {timeout: 30_000}).toContain('First sentence.');
        await expect(body.citations()).toHaveCount(1);
        await expect(body.figures()).toHaveCount(1);
        await expect(body.unsavedBadge()).toBeHidden();
        await expect(body.importStatus()).toHaveCount(0);
        expect(await body.editorText()).not.toContain('K3');

        // A save, then a save with nothing changed: "Saved", and one more
        // History line naming "bodyText.json" and the manager (Rule 15;
        // Side effects).
        await body.save();
        await expect(body.unsavedBadge()).toBeHidden();
        const linesBefore = await historyNaming(page, frame, 'bodyText.json');
        expect(linesBefore.length).toBeGreaterThan(0);
        await body.saveExpectingSaved();
        const log = new ActivityLogWindow(page, frame);
        await log.open();
        const all = await log.historyLines();
        await log.close();
        await pastCloseWindow(page);
        const linesAfter = all.filter((l) => l.event.includes('"bodyText.json"'));
        expect(linesAfter.length).toBe(linesBefore.length + 1);
        expect(`${all[0].user} | ${all[0].event}`).toBe(
            `Maya Manager | A file revision "bodyText.json" was uploaded for submission ${submission.submissionId} by ${MANAGER}.`
        );
    });

    test('S3: roles that may not edit the publication', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s3', testInfo);
        const [production, review] = await Promise.all([
            ojsApi.createSubmission({
                tag,
                context: JOURNAL,
                submitter: AUTHOR,
                title: `Roles ${tag}`,
                decisions: PRODUCTION,
                participants: [{username: 'layouteditor.leo', role: 'layoutEditor'}],
                jats: {file: 'article.xml'},
            }),
            ojsApi.createSubmission({
                tag: `${tag}r`,
                context: JOURNAL,
                submitter: AUTHOR,
                title: `Roles ${tag}r`,
                decisions: ['sendExternalReview'],
                participants: [{username: 'assistant.rita', role: 'funding'}],
                jats: {file: 'article.xml'},
            }),
        ]);

        // The Layout Editor on "JATS XML": the uploaded XML, "More
        // Information" and "Download", no "Upload", no "Delete" (Actors
        // rows 1–4).
        const le = await pageAs(asUser, 'layouteditor.leo', JOURNAL);
        await le.frame.gotoEditorial(production.submissionId);
        await le.jats.openFromMenu();
        await expect(le.jats.xml()).toContainText(FIXTURE_TITLE);
        await le.jats.expectButtons(['More Information', 'Download']);

        // The Layout Editor on "Body Text": "No references yet."; "Save" is
        // refused with an "Error" window, "OK" (Fields; Actors row 5).
        await le.body.openFromMenu();
        await expect(le.body.referencesHint()).toHaveText(TEXT.dragHint);
        await expect(le.body.referenceItems()).toHaveText([TEXT.noReferences]);
        await le.body.typeAtEnd('Layout text');
        const refused = await le.body.save();
        expect(refused.ok()).toBe(false);
        await expect(le.frame.errorDialog()).toBeVisible();
        await expect(le.frame.errorDialog()).toContainText(TEXT.notAllowed);
        await le.frame.dismissErrorDialog();

        // The Funding Coordinator in Review: the uploaded XML, "More
        // Information" and "Download", no "Upload", no "Delete" (Actors
        // rows 1–2); "More Information" reads the stage refusal (row 3).
        const fc = await pageAs(asUser, 'assistant.rita', JOURNAL);
        await fc.frame.gotoEditorial(review.submissionId);
        await fc.jats.openFromMenu();
        await expect(fc.jats.xml()).toContainText(FIXTURE_TITLE);
        await fc.jats.expectButtons(['More Information', 'Download']);
        await fc.jats.button('More Information').click();
        const center = fc.page.getByRole('dialog', {name: 'Information Center: article.xml', exact: true});
        await expect(center).toBeVisible({timeout: 30_000});
        await expect(center).toContainText(TEXT.noStageAccess);

        // The Journal Manager's "Body Text" holds no "Layout text" (Actors
        // row 5): the editor has arrived, empty.
        const jm = await pageAs(asUser, MANAGER, JOURNAL);
        await jm.frame.gotoEditorial(production.submissionId);
        await jm.body.openFromMenu();
        await expect.poll(() => jm.body.editorText(), {timeout: 30_000}).toBe('');

        // Control: the Journal Manager's "JATS XML" offers "Upload" and
        // "Delete" beside "More Information" and "Download" (Actors row 2).
        await jm.jats.openFromMenu();
        await expect(jm.jats.xml()).toContainText(FIXTURE_TITLE);
        await jm.jats.expectButtons(['Upload', 'More Information', 'Delete', 'Download']);
    });

    test('S4: the published "JATS XML" link', async ({asUser, ojsApi, browser, baseURL}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s4', testInfo);
        // A throwaway Journal Manager on a scratch journal of the test's
        // own: "no toast" is read on a page of the manager's account, and a
        // notice another test left for a shared account shows on any page
        // of it that loads (patterns.md parallel lesson 2).
        const {manager, author} = await seedJournal(ojsApi, tag);
        const submission = await ojsApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            title: `Published ${tag}`,
            decisions: PRODUCTION,
            galleys: [{label: 'PDF', file: 'article.pdf'}],
            published: true,
        });
        const visitor = await visitorPage(browser, baseURL);
        const {page, frame, jats} = await pageAs(asUser, manager, tag);

        // No link while unticked: "PDF" alone (Rule 10).
        await openArticle(visitor, tag, submission.submissionId);
        await expect(articleLinks(visitor)).toHaveText(['PDF']);
        await expect(jatsLink(visitor)).toHaveCount(0);

        // "Cancel": the "Enable JATS XML Download" window, its text and
        // buttons; the box unticked again (Rule 9).
        await frame.gotoEditorial(submission.submissionId);
        await jats.openFromMenu();
        await expect(jats.makePublicBox()).not.toBeChecked();
        let dialog = await jats.pressMakePublic(true);
        await expect(dialog).toContainText(TEXT.enableTitle);
        await expect(dialog).toContainText(TEXT.enableMessage);
        await expect(dialog.getByRole('button', {name: 'Confirm', exact: true})).toBeVisible();
        await expect(dialog.getByRole('button', {name: 'Cancel', exact: true})).toBeVisible();
        await jats.cancelVisibility(dialog);
        await expect(jats.makePublicBox()).not.toBeChecked();

        // "Confirm": the window closes, the box stays ticked, no toast
        // (Rule 9).
        dialog = await jats.pressMakePublic(true);
        const saved = await jats.confirmVisibility(dialog);
        expect(saved.ok()).toBe(true);
        await expect(jats.makePublicBox()).toBeChecked();
        await expectNoNotice(page);
        const shown = flat(await jats.xmlText());

        // The link: "JATS XML" next to "PDF"; it saves
        // "submission-{n}-publication-{m}-jats.xml", the numbers of its
        // address, holding the XML the page shows (Actors row 7; Rules 9,
        // 10).
        await openArticle(visitor, tag, submission.submissionId);
        await expect(articleLinks(visitor)).toHaveText(['PDF', TEXT.jatsLink]);
        const numbers = jatsLinkNumbers((await jatsLink(visitor).getAttribute('href')) || '');
        expect(numbers).toEqual({submissionId: submission.submissionId, publicationId: submission.publicationId});
        const file = await pressJatsLink(visitor);
        expect(file.name).toBe(`submission-${numbers.submissionId}-publication-${numbers.publicationId}-jats.xml`);
        expect(flat(file.text)).toBe(shown);

        // Unticking: the "Disable JATS XML Download" window, "Confirm"; the
        // link goes (Rules 9, 10).
        dialog = await jats.pressMakePublic(false);
        await expect(dialog).toContainText(TEXT.disableTitle);
        await expect(dialog).toContainText(TEXT.disableMessage);
        await jats.confirmVisibility(dialog);
        await expect(jats.makePublicBox()).not.toBeChecked();
        await openArticle(visitor, tag, submission.submissionId);

        // Control: "PDF" stays throughout; only "JATS XML" comes and goes
        // (Rule 10).
        await expect(articleLinks(visitor)).toHaveText(['PDF']);
        await expect(jatsLink(visitor)).toHaveCount(0);
    });

    test('S5: the "JATS XML" link before publication', async ({asUser, ojsApi, browser, baseURL}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s5', testInfo);
        const submission = await ojsApi.createSubmission({
            tag,
            context: JOURNAL,
            submitter: AUTHOR,
            title: `Preview ${tag}`,
            decisions: PRODUCTION,
            jats: {makePublic: true},
        });

        // The Journal Manager's "Preview": it lists "JATS XML", which
        // downloads; the two addresses noted (Rule 11).
        const jm = await pageAs(asUser, MANAGER, JOURNAL);
        await jm.frame.gotoEditorial(submission.submissionId);
        await jm.frame.headerButton('Preview').click();
        await jm.page.waitForURL(/\/article\/view\/\d+/, {waitUntil: 'commit', timeout: 30_000});
        await expect(jatsLink(jm.page)).toHaveText(TEXT.jatsLink, {timeout: 30_000});
        const previewUrl = jm.page.url();
        const linkUrl = new URL((await jatsLink(jm.page).getAttribute('href')) || '', previewUrl).href;
        const expectedName = `submission-${submission.submissionId}-publication-${submission.publicationId}-jats.xml`;
        let file = await pressJatsLink(jm.page);
        expect(file.name).toBe(expectedName);
        expect(file.text).toContain('<article');

        // The submitting Author: "View" on My Submissions, no "Preview";
        // the link's address downloads (Rule 11).
        const au = await pageAs(asUser, AUTHOR, JOURNAL);
        const mySubmissions = new MySubmissionsPage(au.page, JOURNAL);
        await mySubmissions.goto();
        await au.frame.openFromRow(await mySubmissions.findRowByTag(tag), submission.submissionId);
        await expect.poll(() => au.frame.headerButtonLabels(), {timeout: 30_000}).toContain('Library');
        expect(await au.frame.headerButtonLabels()).not.toContain('Preview');
        await expect(au.page.getByRole('button', {name: 'Preview', exact: true})).toHaveCount(0);
        file = await gotoDownload(au.page, linkUrl);
        expect(file.name).toBe(expectedName);

        // Refused: another Author, the Reader and a signed-out visitor get
        // the raw refusal at the link and "404 Not Found" at the Preview
        // (Rule 11).
        const others = [
            (await pageAs(asUser, 'author.bea', JOURNAL)).page,
            (await pageAs(asUser, 'reader.rosa', JOURNAL)).page,
            await visitorPage(browser, baseURL),
        ];
        for (const other of others) {
            expect((await gotoText(other, linkUrl)).text).toBe(TEXT.refusal);
            expect((await gotoText(other, previewUrl)).text).toContain(TEXT.notFound);
        }

        // Unticked: the Preview lists no "JATS XML" (its preview notice the
        // control), and the address refuses the Journal Manager too (Rule
        // 11).
        await jm.jats.open(submission.submissionId, submission.publicationId);
        await expect(jm.jats.makePublicBox()).toBeChecked();
        const dialog = await jm.jats.pressMakePublic(false);
        await expect(dialog).toContainText(TEXT.disableTitle);
        await jm.jats.confirmVisibility(dialog);
        await jm.page.goto(previewUrl);
        await expect(jm.frame.previewNotice()).toBeVisible({timeout: 30_000});
        await expect(jatsLink(jm.page)).toHaveCount(0);
        const refused = await gotoText(jm.page, linkUrl);
        expect(refused.text).toBe(TEXT.refusal);

        // Control: the refused address is the one that downloaded for the
        // Journal Manager and the submitting Author (Rule 11).
        expect(jm.page.url()).toBe(linkUrl);
    });

    test('S6: a new version keeps the JATS file', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s6', testInfo);
        const submission = await ojsApi.createSubmission({
            tag,
            context: JOURNAL,
            submitter: AUTHOR,
            title: `Versions ${tag}`,
            decisions: PRODUCTION,
            jats: {file: 'article.xml', makePublic: true},
            published: true,
        });
        const {page, frame, jats} = await pageAs(asUser, MANAGER, JOURNAL);

        // The published version's page: the fixture, the box ticked, the
        // line naming the uploader (Fields).
        await frame.gotoEditorial(submission.submissionId);
        await jats.openFromMenu();
        await expect(jats.xml()).toContainText(FIXTURE_TITLE);
        await expect(jats.makePublicBox()).toBeChecked();
        const noted = flat(await jats.line().innerText());
        const original = modificationLine(noted);
        expect(original.username).toBe('admin');

        // "Create New Version": the new version's page shows the fixture
        // with all four buttons, the box ticked, the line with the moment
        // of the press and the noted username (Rule 13; Fields, the tick
        // box).
        const publish = new PublishScreen(page, JOURNAL);
        const versionDialog = await publish.openCreateVersionDialog();
        const pressedFrom = serverStamp(new Date(Date.now() - 2000));
        const newPublicationId = await publish.confirmVersionDialog(versionDialog);
        const pressedTo = serverStamp(new Date(Date.now() + 2000));
        await jats.open(submission.submissionId, newPublicationId);
        await expect(jats.xml()).toContainText(FIXTURE_TITLE);
        await jats.expectButtons(['Upload', 'More Information', 'Delete', 'Download']);
        await expect(jats.makePublicBox()).toBeChecked();
        const copy = modificationLine(await jats.line().innerText());
        expect(copy.username).toBe(original.username);
        expect(copy.date >= pressedFrom && copy.date <= pressedTo, `${copy.date} between ${pressedFrom} and ${pressedTo}`).toBe(true);

        // The copy is a file of its own: deleting it leaves the generated
        // XML (Rules 1, 5, 13).
        await jats.openDelete();
        await jats.confirmDelete();
        await expect(jats.line()).toHaveText(TEXT.generatedLine);
        await expect(jats.xml()).not.toContainText(FIXTURE_TITLE);

        // Control: the published version still shows the fixture and the
        // noted line (Rule 13).
        await jats.open(submission.submissionId, submission.publicationId);
        await expect(jats.xml()).toContainText(FIXTURE_TITLE);
        await expect(jats.line()).toHaveText(noted);
    });

    test('S7: "JATS Template Plugin" off', async ({asUser, ojsApi, browser, baseURL}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s7', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag, {plugins: {jatstemplateplugin: {enabled: false}}});
        const submission = await ojsApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            title: `Plugin off ${tag}`,
            decisions: PRODUCTION,
            jats: {makePublic: true},
            published: true,
        });
        const {page, frame, jats} = await pageAs(asUser, manager, tag);

        // The "JATS XML" page still generates, with "Download" (Settings
        // bullet 1; Rule 1).
        await frame.gotoEditorial(submission.submissionId);
        await jats.openFromMenu();
        await expect(jats.xml()).toContainText(`Plugin off ${tag}`);
        await expect(jats.line()).toHaveText(TEXT.generatedLine);
        await expect(jats.button('Download')).toBeVisible();

        // The published link downloads (Settings bullet 1; Rule 10).
        const visitor = await visitorPage(browser, baseURL);
        await openArticle(visitor, tag, submission.submissionId);
        await expect(jatsLink(visitor)).toHaveText(TEXT.jatsLink);
        const file = await pressJatsLink(visitor);
        expect(file.name).toBe(`submission-${submission.submissionId}-publication-${submission.publicationId}-jats.xml`);

        // Statistics › "Articles": no "JATS" column; the table's other
        // columns are there (Settings bullet 1).
        const columns = await statsArticleColumns(page, tag);
        expect(columns.length, JSON.stringify(columns)).toBeGreaterThan(1);
        expect(columns, JSON.stringify(columns)).not.toContain('JATS');

        // Control: the seeded journal, the plugin on, has the column
        // (Settings bullet 1).
        const jm = await pageAs(asUser, MANAGER, JOURNAL);
        const seeded = await statsArticleColumns(jm.page, JOURNAL);
        expect(seeded, JSON.stringify(seeded)).toContain('JATS');
    });

    test('S8: registered readers only', async ({asUser, ojsApi, browser, baseURL}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s8', testInfo);
        const reader = `${tag}rd`;
        const {author} = await seedJournal(ojsApi, tag, {
            restrictArticleAccess: true,
            extra: [user(reader, 'Rhea', 'Reader', ['reader'])],
        });
        const [submission, open] = await Promise.all([
            ojsApi.createSubmission({
                tag,
                context: tag,
                submitter: author,
                title: `Registered ${tag}`,
                decisions: PRODUCTION,
                jats: {makePublic: true},
                published: true,
            }),
            ojsApi.createSubmission({
                tag: `${tag}o`,
                context: JOURNAL,
                submitter: AUTHOR,
                title: `Open ${tag}`,
                decisions: PRODUCTION,
                jats: {makePublic: true},
                published: true,
            }),
        ]);
        const expectedName = `submission-${submission.submissionId}-publication-${submission.publicationId}-jats.xml`;

        // Signed out: "JATS XML" leads to the Login page (Settings bullet
        // 2).
        const visitor = await visitorPage(browser, baseURL);
        await openArticle(visitor, tag, submission.submissionId);
        await jatsLink(visitor).click();
        await visitor.waitForURL(/\/login\b/, {waitUntil: 'commit', timeout: 30_000});
        const login = new LoginPage(visitor);
        await login.expectForm();

        // Signing in there: the file downloads (Settings bullet 2; Rule 10).
        const {download} = await captureDownload(visitor, () => login.submitCredentials(reader, `${reader}${reader}`));
        expect((await readDownload(download)).name).toBe(expectedName);

        // Signed in beforehand: the file downloads at once, no Login page
        // (Settings bullet 2).
        await openArticle(visitor, tag, submission.submissionId);
        const again = await pressJatsLink(visitor);
        expect(again.name).toBe(expectedName);
        await expect(visitor).toHaveURL(new RegExp(`/article/view/${submission.submissionId}$`));

        // Control: on the seeded journal, the box unticked, a signed-out
        // visitor downloads at once (Settings bullet 2).
        const other = await visitorPage(browser, baseURL);
        await openArticle(other, JOURNAL, open.submissionId);
        const direct = await pressJatsLink(other);
        expect(direct.name).toBe(`submission-${open.submissionId}-publication-${open.publicationId}-jats.xml`);
        await expect(other).toHaveURL(new RegExp(`/article/view/${open.submissionId}$`));
    });
});
