// @ts-check
/**
 * @file playwright/tests/U44-identifiers.spec.js
 *
 * Identifiers (publisher IDs & URN) — OPS suite, one test per canonical
 * scenario the spec runs on a preprint server (S1 common, S7 {OPS}; S2–S4
 * are {OJS OMP} and S5, S6 {OJS}: a preprint server installs no URN plugin
 * and has no issues, which S7's last bullet reads), in the preprint
 * server's own words: the Preprint Server Manager, a preprint, the
 * "Preprint" group whose pages are headed "Preprint: …", the boxes "Enable
 * for Preprints" and "Enable for Galleys", the Moderator, a posted
 * preprint.
 * Spec: docs/specs/U44-identifiers.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A2 🐞: no publisher ID is emptied on a galley's tab.
 * - A3 🐞: the Metadata page's "Publisher ID" is typed once, with a value
 *   no other preprint carries.
 * - A4–A14: the URN's, which a preprint server does not have. OJS1–OJS3
 *   and OMP1–OMP6: the journal's and the press's, in those trees.
 *
 * Seeding: scenario endpoints only; publicknowledge is never touched. Every
 * scenario runs on its own scratch preprint server with throwaway accounts
 * (the username twice as password), as footnote s says: `enablePublisherId`
 * for the "Publisher ID" boxes (S7; S1 ticks them on screen because that
 * screen is what it tests), the submission's `galleys[]` (`preprint.pdf`)
 * and `participants[]` (S7's Moderator with "Permissions" unticked,
 * `canChangeMetadata: false`), a posted preprint from `published: true`.
 * The Author role's "Permit submission metadata edit." is ticked on a fresh
 * preprint server (seed-facts), so S7's Author may edit the unposted
 * preprint.
 *
 * Every absence is read settled and paired with a positive control taken
 * the same way (M4, M6): S1's switched-off field against the page's own
 * "Keywords" and the window's "Edit Metadata" tab, S7's "only View" against
 * the unposted row's menu, the read-only tabs against the Preprint Server
 * Manager's editable one, the missing "URN" row against the "Default
 * Theme" row of the same grid. S1's mailbox silence is bounded by a
 * discussion the manager opens with a spare account of its own server
 * (A8). Browser dialogs are accepted and recorded on every page. Waits are
 * web-first or bounded by the screen's own answer (A5). Everything runs in
 * the parallel `ops` project: the settings are per scratch server.
 */
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {ActivityLogWindow} = require('../../../../shared/playwright/pages/ActivityLogPages.js');
const {
    IDENTIFIERS_TEXT: TEXT,
    PublisherIdSettings,
    UrnPluginSettings,
    IdentifiersPage,
    GalleysPage,
} = require('../../../../shared/playwright/pages/IdentifiersPages.js');
const {PublicationScreen, openWorkflow, addDiscussion} = require('../pages/PublicationPages.js');

const METADATA_EVENT = 'Submission metadata updated';
const SERVER_BOXES = ['Enable for Preprints', 'Enable for Galleys'];
const PREPRINT_FILE = 'preprint.pdf';

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u44${scenario}opw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: mailOf(username), roles};
}

/**
 * Seed a scratch preprint server with a throwaway Preprint Server Manager
 * and Author, and `extra` accounts; returns the usernames.
 */
async function seedServer(opsApi, tag, {extra = [], ...keys} = {}) {
    const users = [user(`${tag}mg`, 'Mona', 'Manager', ['manager']), user(`${tag}au`, 'Ada', 'Author', ['author']), ...extra];
    await opsApi.createContext({tag, users, ...keys});
    return {manager: `${tag}mg`, author: `${tag}au`};
}

/**
 * A page as `username` with the workflow frame of `contextPath` (the
 * "Preprint" group), every browser dialog accepted and recorded.
 */
async function pageAs(asUser, appContext, username, contextPath) {
    const page = await (await asUser(username)).newPage();
    /** @type {string[]} */
    const asked = [];
    page.on('dialog', (dialog) => {
        asked.push(`${dialog.type()}: ${dialog.message()}`);
        dialog.accept().catch(() => {});
    });
    const frame = new WorkflowPage(page, contextPath, {appContext, labels: {publicationGroup: 'Preprint'}});
    return {page, frame, asked};
}

/** Open the Metadata page by address; settled on its "Keywords" field, the page's own control. */
async function openMetadata(frame, submission) {
    await frame.gotoEditorial(submission.submissionId, {menuKey: `publication_${submission.publicationId}_metadata`});
    await frame.expectPageHeading('Metadata');
    await expect(frame.dialog().getByText('Keywords', {exact: true}).first()).toBeVisible({timeout: 30_000});
}

/** The Activity Log's line count and its "Submission metadata updated" count, then the window closed. */
async function activityLogCounts(page, frame) {
    const log = new ActivityLogWindow(page, frame);
    await log.open();
    const lines = await log.historyLines();
    await log.close();
    return {total: lines.length, metadata: lines.filter((l) => l.event === METADATA_EVENT).length};
}

test.describe('identifiers', () => {
    test('S1: switch publisher IDs on and type them', {tag: '@smoke'}, async ({asUser, opsApi, pkpMail, appContext}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s1', testInfo);
        const spare = `${tag}x`;
        const {manager, author} = await seedServer(opsApi, tag, {
            extra: [user(spare, 'Xena', 'Spare', ['author'])],
        });
        const [submission, control] = await Promise.all([
            opsApi.createSubmission({
                tag,
                context: tag,
                submitter: author,
                galleys: [
                    {label: 'PDF', file: PREPRINT_FILE},
                    {label: 'HTML', file: PREPRINT_FILE},
                ],
            }),
            opsApi.createSubmission({tag: `${tag}c`, context: tag, submitter: spare}),
        ]);
        const {page, frame} = await pageAs(asUser, appContext, manager, tag);
        const ids = new IdentifiersPage(page, frame);
        const galleys = new GalleysPage(page, frame);
        const settings = new PublisherIdSettings(page, tag);

        // Control: before the first "Save" on Settings the Metadata page
        // shows no "Publisher ID" (Rules 1, 2).
        await openMetadata(frame, submission);
        await expect(ids.metadataPublisherIdBox()).toHaveCount(0);

        // The "Publisher ID" boxes: the help text and the preprint server's
        // two boxes, both unticked; tick both, "Save" (Fields; Settings
        // bullet 1).
        await settings.open();
        await expect(settings.group()).toContainText(TEXT.publisherIdHelp);
        await expect
            .poll(() => settings.boxes(), {timeout: 30_000})
            .toEqual(SERVER_BOXES.map((label) => ({label, checked: false})));
        await settings.setBoxes({'Enable for Preprints': true, 'Enable for Galleys': true});
        await settings.save();

        // The Metadata page: a "Publisher ID" box; "pid-a1" saved and back
        // after a reload (Rules 2, 3). The Activity Log's baseline first.
        await openMetadata(frame, submission);
        const logBefore = await activityLogCounts(page, frame);
        await expect(ids.metadataPublisherIdBox()).toBeVisible();
        await ids.metadataPublisherIdBox().fill('pid-a1');
        await ids.save();
        await openMetadata(frame, submission);
        await expect(ids.metadataPublisherIdBox()).toHaveValue('pid-a1');

        // A galley's publisher ID: digits alone and "/" refused at the top of
        // the tab with the window open; "pid-g1" closes the window and is
        // back when the tab is opened again (Rule 4).
        await galleys.open(submission.submissionId, submission.publicationId);
        let tab = await galleys.openIdentifiers('PDF');
        await expect(tab.publisherIdBox()).toBeVisible();
        await tab.publisherIdBox().fill('12345');
        await tab.saveRefused();
        await expect(tab.form()).toContainText(TEXT.notANumber('12345'));
        await tab.publisherIdBox().fill('a/b');
        await tab.saveRefused();
        await expect(tab.form()).toContainText(TEXT.slash);
        await tab.publisherIdBox().fill('pid-g1');
        await tab.save();
        tab = await galleys.openIdentifiers('PDF');
        await expect(tab.publisherIdBox()).toHaveValue('pid-g1');
        await tab.close();

        // A publisher ID another galley has: refused on "HTML", "…within
        // your server." (Rule 4).
        tab = await galleys.openIdentifiers('HTML');
        await tab.publisherIdBox().fill('pid-g1');
        await tab.saveRefused();
        await expect(tab.form()).toContainText(TEXT.duplicate('pid-g1', 'server'));
        await tab.close();

        // The Activity Log: one "Submission metadata updated" line more,
        // from the Metadata page, and nothing from the galley saves (Side
        // effects).
        const logAfter = await activityLogCounts(page, frame);
        expect(logAfter.metadata).toBe(logBefore.metadata + 1);
        expect(logAfter.total).toBe(logBefore.total + 1);

        // No email about these saves: bounded by the one mail the test sends
        // itself the same way, a discussion with the spare on the spare's
        // own preprint (Side effects; A8).
        const discussion = `Control ${tag}`;
        await openWorkflow(page, tag, control.submissionId);
        await new PublicationScreen(page).openProductionStage();
        await addDiscussion(page, {name: discussion, message: `Control message ${tag}.`, participants: [spare]});
        const afterControl = {to: mailOf(spare), subject: discussion};
        await pkpMail.expectNone({to: mailOf(author), afterControl});
        // The manager opened the discussion and is on it: its copy of the
        // control is its only mail.
        await expect.poll(() => pkpMail.count({to: mailOf(manager), subject: discussion}), {timeout: 20_000}).toBe(1);
        expect(await pkpMail.count({to: mailOf(manager)})).toBe(1);

        // Switched off: no "Publisher ID" on the Metadata page, no
        // "Identifiers" tab on the "PDF" galley's window (its "Edit
        // Metadata" tab the control) (Rule 2; Settings bullet 1).
        await settings.open();
        await settings.setBoxes({'Enable for Preprints': false, 'Enable for Galleys': false});
        await settings.save();
        await openMetadata(frame, submission);
        await expect(ids.metadataPublisherIdBox()).toHaveCount(0);
        await galleys.open(submission.submissionId, submission.publicationId);
        tab = await galleys.openEdit('PDF');
        await expect(tab.tab('Edit Metadata')).toBeVisible();
        await expect(tab.tab('Identifiers')).toHaveCount(0);
        await tab.close();

        // On again: both values are back (Rule 2).
        await settings.open();
        await settings.setBoxes({'Enable for Preprints': true, 'Enable for Galleys': true});
        await settings.save();
        await openMetadata(frame, submission);
        await expect(ids.metadataPublisherIdBox()).toHaveValue('pid-a1');
        await galleys.open(submission.submissionId, submission.publicationId);
        tab = await galleys.openIdentifiers('PDF');
        await expect(tab.publisherIdBox()).toHaveValue('pid-g1');
        await tab.close();
    });

    test("S7: a preprint's galley before and after posting", async ({asUser, opsApi, appContext}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s7', testInfo);
        const moderator = `${tag}md`;
        const {manager, author} = await seedServer(opsApi, tag, {
            extra: [user(moderator, 'Moe', 'Moderator', ['sectionEditor'])],
            enablePublisherId: ['galley'],
        });
        const common = {
            context: tag,
            submitter: author,
            galleys: [{label: 'PDF', file: PREPRINT_FILE}],
            participants: [{username: moderator, role: 'sectionEditor', canChangeMetadata: false}],
        };
        const [unposted, posted] = await Promise.all([
            opsApi.createSubmission({tag, ...common}),
            opsApi.createSubmission({tag: `${tag}p`, ...common, published: true}),
        ]);

        // The Author, before posting: from My Submissions, the "PDF" row's
        // menu offers "Edit"; "pid-au1" saved on the "Identifiers" tab
        // closes the window and is back when the tab is opened again
        // (Actors row 6).
        const au = await pageAs(asUser, appContext, author, tag);
        const auGalleys = new GalleysPage(au.page, au.frame);
        await auGalleys.openAuthor(unposted.submissionId, unposted.publicationId);
        const unpostedItems = await auGalleys.openMenu('PDF');
        expect(unpostedItems).toContain('Edit');
        let tab = await auGalleys.pickMenuItem('Edit');
        await tab.openIdentifiersTab();
        await expect(tab.publisherIdBox()).toBeEditable();
        await tab.publisherIdBox().fill('pid-au1');
        await tab.save();
        await auGalleys.openMenu('PDF');
        tab = await auGalleys.pickMenuItem('Edit');
        await tab.openIdentifiersTab();
        await expect(tab.publisherIdBox()).toHaveValue('pid-au1');
        await tab.close();

        // The Author, after posting: the "PDF" row's menu offers only
        // "View" (the unposted row's menu, read the same way, offered
        // "Edit" and more), which opens the window with the "Identifiers"
        // tab read-only: the box greyed, "Save" greyed (Actors row 6).
        await auGalleys.openAuthor(posted.submissionId, posted.publicationId);
        expect(await auGalleys.openMenu('PDF')).toEqual(['View']);
        expect(unpostedItems.length).toBeGreaterThan(1);
        tab = await auGalleys.pickMenuItem('View');
        await tab.openIdentifiersTab();
        await expect(tab.publisherIdBox()).toBeVisible();
        await expect(tab.publisherIdBox()).toBeDisabled();
        await expect(tab.saveButton()).toBeDisabled();
        await tab.close();

        // The Moderator, before posting ("Permissions" unticked): the
        // unposted preprint's "PDF" tab is read-only, holding the Author's
        // value (Actors row 6).
        const md = await pageAs(asUser, appContext, moderator, tag);
        const mdGalleys = new GalleysPage(md.page, md.frame);
        await mdGalleys.open(unposted.submissionId, unposted.publicationId);
        tab = await mdGalleys.openIdentifiers('PDF');
        await expect(tab.publisherIdBox()).toHaveValue('pid-au1');
        await expect(tab.publisherIdBox()).toBeDisabled();
        await expect(tab.saveButton()).toBeDisabled();
        await tab.close();

        // The Moderator, after posting: "pid-m1" saved on the posted
        // preprint's "PDF" tab closes the window and is back when the tab is
        // opened again (Actors row 6).
        await mdGalleys.open(posted.submissionId, posted.publicationId);
        tab = await mdGalleys.openIdentifiers('PDF');
        await expect(tab.publisherIdBox()).toBeEditable();
        await tab.publisherIdBox().fill('pid-m1');
        await tab.save();
        tab = await mdGalleys.openIdentifiers('PDF');
        await expect(tab.publisherIdBox()).toHaveValue('pid-m1');
        await tab.close();

        // No URN on a preprint server: "Public Identifier Plugins" is listed
        // with no plugin row and no "URN" anywhere in the grid; the "Default
        // Theme" row, read the same way, is the control (Purpose).
        const mg = await pageAs(asUser, appContext, manager, tag);
        const plugins = new UrnPluginSettings(mg.page, tag);
        await plugins.openPluginsGrid('Default Theme');
        await expect(plugins.categoryHeadingRow('pubIds')).toHaveText(/Public Identifier Plugins/);
        await expect(plugins.categoryPluginRows('pubIds')).toHaveCount(0);
        await expect(plugins.pluginRowNamed('URN')).toHaveCount(0);
        await expect(plugins.row()).toHaveCount(0);
        await expect(plugins.pluginRowNamed('Default Theme')).toHaveCount(1);

        // Control: the Preprint Server Manager's "PDF" tab on the unposted
        // preprint holds "pid-au1" and can be typed in (Actors row 6).
        const mgGalleys = new GalleysPage(mg.page, mg.frame);
        await mgGalleys.open(unposted.submissionId, unposted.publicationId);
        tab = await mgGalleys.openIdentifiers('PDF');
        await expect(tab.publisherIdBox()).toHaveValue('pid-au1');
        await expect(tab.publisherIdBox()).toBeEditable();
        await expect(tab.saveButton()).toBeEnabled();
        await tab.close();
    });
});
