// @ts-check
/**
 * @file playwright/tests/U19-oai-pmh.spec.js
 *
 * OAI-PMH — OJS suite, one test per canonical scenario: S1–S6 common to the
 * three apps (with their {OJS} bullets inline: "Future Tides" scheduled in
 * an unpublished issue, three formats, the article records), S7 {OJS OPS}
 * ("Enable OAI"), S8–S10 {OJS} (MARC, JATS, DRIVER and the journal that
 * does not publish online).
 * Spec: docs/specs/U19-oai-pmh.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1 🐞: no journal's unfiltered list is asserted complete or empty; S3
 *   reads "Tidal Patterns" as no longer live at the journal's address,
 *   never as missing there, and never reads the journal's GetRecord of it.
 * - A2 🐞, A3 🐞, A20 🐞: S5 gives whole days only, all in the calendar.
 * - A4 🐞, A24 🐞: no last part's "Resume" is read; S10's `driver` list is
 *   read on its first part, its token neither asserted nor followed.
 * - A5 🐞: no ListMetadataFormats with an identifier is opened in the browser.
 * - A6 ❓, A8 🐞, A14 ❓: no "Supporting Agencies", "Rights" or source line of
 *   an article in no issue is read; no galley language.
 * - A7 🐞: the section's type word is never asserted as "Peer-reviewed
 *   Article"; S1 reads the two eu-repo types beside whatever else is there.
 * - A9 ❓: S10 reads "Paper Tides" as the scenario says.
 * - A10 🐞: no `jats` ListRecords; A11 🐞, A23 🐞: no unpublish with DRIVER
 *   on, no member without a galley.
 * - A12 🐞, A15 🐞: MARC records are read by field values, never by their
 *   markup; field 008 is never read.
 * - A13 🐞, A21 ❓: nothing is read in French.
 * - A16 🐞, A17: no argument is given twice.
 * - A18, OMP*, OPS*: the press's and the preprint server's, in those suites.
 * - A19 🐞: no section is deleted.
 * - A22 🐞: no journal versions its DOIs (feature fact: while any OJS
 *   journal has "DOI Versioning" on, every OJS OAI read on the install
 *   fails, and every suite shares the install).
 *
 * Seeding: scenario endpoints only, as footnote s says; publicknowledge and
 * the seeded roster are only read. Every scenario runs on its own scratch
 * journals, each path the test's unique tag (plus a letter), one language,
 * with throwaway accounts (the username twice as password): an Author "Ada
 * Author" who submits every article, a Journal Manager in S3, S7 and S9; S6's
 * Site Administrator is `admin`. Articles are published by the submission
 * scenario (`published`, no `datePublished`), so every datestamp and "Date"
 * is today, UTC. The first section's `abbrev` is a bare string (a locale map
 * stores "Array", scenarios.md). S6 passes `restrictSiteAccess`, S10
 * `publishingMode` and `plugins`; "Enable OAI" (S7), the plugin ticks and
 * the JATS window (S9), the unpublish and second publish (S3, S7) and the
 * Hosted Journals window (S6) are the screens'. S6 seeds "Sea Letters" with
 * `context.country` and `acronym`: the Hosted Journals "Edit" refuses its
 * first "Save" on a journal without a Country (scenarios.md).
 *
 * Reading: the visitor is the fixture `page` (no user: signed out). The OAI
 * answers are read raw through OaiPages' OaiRepository, a fresh request
 * context per read (no session, no language cookie, redirects followed),
 * and the browser view ("OAI 2.0 Request Results") is opened in the
 * visitor's page where a scenario reads the page itself (S1, the refusals
 * of S4, the Login pages of S6, the "Unknown Metadata Format" pages). A
 * journal's unfiltered list is walked through every part ("Resume"): it also
 * carries the first journal's deleted records (A1), so a scratch journal's
 * own records may sit on a later part. The site-wide address lists every
 * context on the install: its reads are GetRecord and `set`-filtered lists
 * of the scenario's own journals. Every absence is read on a settled answer
 * (a whole server response) beside a positive control taken the same way
 * (M4, M6). Everything here runs in the parallel `ojs` project: every
 * setting changed is a scratch journal's own.
 */
const {test, expect} = require('../support/fixtures.js');
const {
    SITE_PATH,
    OAI_TEXT: O,
    parseMarc,
    marcValues,
    oaiIdentifier,
    utcDate,
    recordOf,
    liveTitles,
    OaiRepository,
    OaiView,
    EnableOaiField,
    PluginGrid,
    JatsFormatWindow,
    HostedContextEditWindow,
    siteContactEmail,
} = require('../../../../shared/playwright/pages/OaiPages.js');
const {AccessSettings} = require('../../../../shared/playwright/pages/SubscriptionsPages.js');
const {PublishScreen} = require('../pages/PublishSchedulePages.js');

const M = O.messages;
const KIND = 'article';
const PDF = [{label: 'PDF', file: 'article.pdf'}];
const XML = [{label: 'XML', file: 'article.xml'}];
const PUBLISH_QUESTION = 'Are you sure you want to publish this?';
const HOSTED = {hostedLabel: 'Hosted Journals'};
const OAI_FORMATS = ['marcxml', 'oai_dc', 'oai_marc'];

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u19s${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: `${username}@mail.test`, roles};
}

/**
 * A scratch journal with the throwaway Author (`${tag}au`, Ada Author) and,
 * with `manager`, a Journal Manager (`${tag}mg`), plus context keys.
 */
async function seedJournal(ojsApi, tag, {manager = false, ...keys} = {}) {
    return ojsApi.createContext({
        tag,
        users: [
            ...(manager ? [user(`${tag}mg`, 'Mona', 'Manager', ['manager'])] : []),
            user(`${tag}au`, 'Ada', 'Author', ['author']),
        ],
        ...keys,
    });
}

/** An article submitted by the journal's Author; returns the createSubmission answer. */
async function seedArticle(ojsApi, tag, title, extra = {}) {
    return ojsApi.createSubmission({
        tag: `${tag}${title.replace(/[^A-Za-z]/g, '').slice(0, 6).toLowerCase()}`,
        context: tag,
        submitter: `${tag}au`,
        title,
        ...extra,
    });
}

/** The page of a signed-in actor (its own `asUser` context). */
async function actorPage(asUser, username) {
    return (await asUser(username)).newPage();
}

/** Sorted copy. */
const sorted = (list) => [...list].sort();

/** The metadata prefixes an answer lists, sorted. */
const prefixes = (answer) => sorted(answer.formats.map((f) => f.prefix));

/** Expect an answer to be the refusal `code` with `message`, and nothing else. */
function expectRefusal(answer, code, message, what) {
    expect(answer.status, `${what}: the address answers`).toBe(200);
    expect(answer.errors, `${what}: one error`).toEqual([{code, message}]);
    expect(answer.records, `${what}: no record`).toEqual([]);
}

/** Expect a GetRecord answer to hold the live Dublin Core record of `identifier` titled `title`. */
function expectLiveRecord(answer, identifier, title, what) {
    expect(answer.error, `${what}: no error`).toBeNull();
    const record = recordOf(answer, identifier);
    expect(record, `${what}: the record of ${identifier}`).toBeTruthy();
    expect(record && record.header.deleted, `${what}: not deleted`).toBe(false);
    expect(record && record.dc && record.dc.title, `${what}: its Dublin Core title`).toEqual([title]);
}

/** The identifier of the live record titled `title` in a walked list (fails when there is none or several). */
function identifierOfTitle(list, title) {
    const matches = list.records.filter((r) => r.header && !r.header.deleted && r.dc && r.dc.title[0] === title);
    expect(matches.map((r) => r.header.identifier), `one live record titled ${title}`).toHaveLength(1);
    return matches[0].header.identifier;
}

/** The repository identifier the journal's Identify names. */
async function repositoryIdentifierOf(oai) {
    const identify = await oai.identify();
    expect(identify.identify, 'Identify answers').toBeTruthy();
    return /** @type {string} */ (identify.identify && identify.identify.repositoryIdentifier);
}

/** Every page of the browser view carries the request links above and below, "About the XSLT", and "Request URL". */
async function expectViewFrame(view, requestUrl) {
    expect(await view.quickLinkNames('top')).toEqual(O.quickLinks);
    expect(await view.quickLinkNames('bottom')).toEqual(O.quickLinks);
    await expect(view.aboutXslt()).toBeVisible();
    expect(await view.value('Request URL')).toBe(requestUrl);
}

/**
 * Publish the version shown on the workflow again: the publish button, the
 * "Review Publishing Details" panel when it opens (its version selects
 * filled only when empty; "Don't Assign To An Issue" when offered), then
 * the window's "Publish". A press the page swallows is pressed again (U49
 * fn-k).
 *
 * @param {PublishScreen} pub
 */
async function publishShown(pub) {
    const page = pub.page;
    const button = pub.publishButton();
    await expect(button).toBeVisible({timeout: 30_000});
    const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
    const stage = panel.locator('select[name="versionStage"]');
    const confirmation = pub.confirmationDialog(PUBLISH_QUESTION);
    await button.click();
    try {
        await expect(stage.or(confirmation)).toBeVisible({timeout: 5_000});
    } catch {
        await button.click();
    }
    await expect(stage.or(confirmation)).toBeVisible({timeout: 30_000});
    if (await stage.isVisible()) {
        if (!(await stage.inputValue())) await stage.selectOption('VoR');
        const minor = panel.locator('select[name="versionIsMinor"]');
        if ((await minor.isVisible()) && !(await minor.inputValue())) await minor.selectOption('false');
        const noIssue = panel.getByRole('radio', {name: "Don't Assign To An Issue"});
        if (await noIssue.isVisible()) await noIssue.check();
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
    }
    await expect(confirmation).toBeVisible({timeout: 30_000});
    await pub.confirmPublish(confirmation, 'Publish');
    await pub.expectStatus('Published');
}

/** Unpublish a published article on its workflow (U49 scenario 3's way). */
async function unpublishOnScreen(pub, submissionId) {
    await pub.gotoWorkflow(submissionId);
    await pub.openEntry('Title & Abstract');
    await pub.expectStatus('Published');
    await pub.unpublish();
}

test.describe('OAI-PMH', () => {
    test('S1: A harvester reads a journal\'s address', async ({ojsApi, page, baseURL}, testInfo) => {
        test.slow();
        const tag = makeTag(1, testInfo);
        const other = `${tag}b`;
        const issue = {volume: 1, number: 2, year: 2026};
        await seedJournal(ojsApi, tag, {
            context: {name: 'Sea Letters', contactName: 'Pat Contact', contactEmail: 'pat.contact@example.org'},
            sections: [{abbrev: 'ART', title: 'Articles'}],
            issues: [issue],
        });
        const tidal = await seedArticle(ojsApi, tag, 'Tidal Patterns', {
            abstract: 'Tides follow the moon.',
            keywords: ['tides', 'moon'],
            published: true,
            galleys: PDF,
        });
        const draft = await seedArticle(ojsApi, tag, 'Draft Study');
        const future = await seedArticle(ojsApi, tag, 'Future Tides', {published: true, issue});
        await seedJournal(ojsApi, other);
        const elsewhere = await seedArticle(ojsApi, other, 'Elsewhere', {published: true});
        const oai = new OaiRepository(String(baseURL), tag);
        const address = oai.address();
        const view = new OaiView(page);
        const today = utcDate();
        const articlePage = `${baseURL}/index.php/${tag}/article/view/${tidal.submissionId}`;
        const galleyAddress = `${articlePage}/${tidal.galleys[0].id}`;

        // Identify: the page "OAI 2.0 Request Results" and the table
        // (Fields, "Identify").
        await view.open(tag, 'verb=Identify');
        await expect(page).toHaveTitle(O.pageTitle);
        await expect(view.requestType()).toHaveText('Request was of type Identify.');
        await expect(view.intro()).toHaveText(O.intro);
        expect(await view.value('Repository Name')).toBe('Sea Letters');
        expect(await view.value('Base URL')).toBe(address);
        expect(await view.value('Protocol Version')).toBe('2.0');
        expect(await view.value('Deleted Record Policy')).toBe('persistent');
        expect(await view.value('Granularity')).toBe('YYYY-MM-DDThh:mm:ssZ');
        expect(await view.value('Admin Email')).toBe('pat.contact@example.org');
        await expect(page.getByRole('heading', {name: 'OAI-Identifier', exact: true})).toBeVisible();
        expect(await view.value('Scheme')).toBe('oai');
        expect(await view.value('Delimiter')).toBe(':');
        const repo = await view.value('Repository Identifier');
        expect(repo).not.toBe('');
        expect(await view.value('Sample OAI Identifier')).toBe(oaiIdentifier(repo, KIND, 1));
        await expect(page.getByRole('heading', {name: 'Unsupported Description Type', exact: true})).toBeVisible();
        await expect(page.locator('body')).toContainText('Open Journal Systems');
        await expectViewFrame(view, address);
        const tidalId = oaiIdentifier(repo, KIND, tidal.submissionId);

        // ListSets: the journal, then its section "Articles" (Rule 7).
        await view.pressQuickLink('ListSets');
        await expect(view.requestType()).toHaveText('Request was of type ListSets.');
        await expect(view.setBlocks()).toHaveCount(2);
        expect(await view.setSpecs(view.setBlock('Sea Letters'))).toEqual([tag]);
        expect(await view.setSpecs(view.setBlock('Articles'))).toEqual([`${tag}:ART`]);
        await expectViewFrame(view, address);

        // ListMetadataFormats: three formats (Rule 10; the table "The formats").
        await view.pressQuickLink('ListMetadataFormats');
        await expect(view.requestType()).toHaveText('Request was of type ListMetadataFormats.');
        await expect(page.getByText(O.formatsIntro, {exact: true})).toBeVisible();
        await expect(view.formatBlocks()).toHaveCount(3);
        expect(sorted(await view.valueList('metadataPrefix'))).toEqual(OAI_FORMATS);
        await expectViewFrame(view, address);

        // ListRecords: the record of "Tidal Patterns", its identifier and its
        // section's setSpec (Rules 3, 7d; the table "A record's header").
        await view.pressQuickLink('ListRecords');
        await expect(view.requestType()).toHaveText('Request was of type ListRecords.');
        await expectViewFrame(view, address);
        const block = await view.findRecord(tidalId);
        expect(await view.identifierIn(block)).toBe(tidalId);
        expect(await view.setSpecs(block)).toEqual([`${tag}:ART`]);
        const list = await oai.listAll('ListRecords');
        const listed = recordOf(list, tidalId);
        expect(listed && listed.header.setSpecs).toEqual([`${tag}:ART`]);
        expect(listed && listed.dc && listed.dc.title).toEqual(['Tidal Patterns']);

        // Not listed: "Draft Study", "Future Tides" and "Elsewhere", beside
        // "Tidal Patterns" (Rule 3).
        const titles = list.records.filter((r) => r.dc).flatMap((r) => r.dc.title);
        expect(titles).toContain('Tidal Patterns');
        for (const absent of ['Draft Study', 'Future Tides', 'Elsewhere']) {
            expect(titles, `${absent} listed`).not.toContain(absent);
        }
        const identifiers = list.headers.map((h) => h.identifier);
        expect(identifiers).toContain(tidalId);
        for (const [name, item] of [['Draft Study', draft], ['Future Tides', future], ['Elsewhere', elsewhere]]) {
            expect(identifiers, `${name}'s identifier listed`).not.toContain(oaiIdentifier(repo, KIND, item.submissionId));
        }
        expect(list.records.filter((r) => r.header && r.header.setSpecs.some((s) => s.startsWith(`${tag}:`))).length).toBe(1);

        // GetRecord: the header's "oai_dc" opens the Dublin Core record
        // (Rule 11; the table "The Dublin Core record").
        await block.getByRole('link', {name: 'oai_dc', exact: true}).click();
        await view.expectLoaded();
        await expect(view.requestType()).toHaveText('Request was of type GetRecord.');
        await expect(view.recordHeading(tidalId)).toHaveCount(1);
        await expect(page.getByRole('heading', {name: O.dcHeading, exact: true})).toBeVisible();
        const shown = view.record(tidalId);
        expect(await view.valueList('Title', shown)).toEqual(['Tidal Patterns']);
        expect(await view.valueList('Author or Creator', shown)).toEqual(['Author, Ada']);
        expect(await view.valueList('Description', shown)).toEqual(['Tides follow the moon.']);
        expect(await view.valueList('Date', shown)).toEqual([today]);
        expect(sorted(await view.valueList('Subject and Keywords', shown))).toEqual(['moon', 'tides']);
        expect(await view.valueList('Publisher', shown)).toEqual(['Sea Letters']);
        expect(await view.valueList('Resource Type', shown)).toEqual(
            expect.arrayContaining(['info:eu-repo/semantics/article', 'info:eu-repo/semantics/publishedVersion'])
        );
        expect(await view.valueList('Format', shown)).toEqual(['application/pdf']);
        expect(await view.valueList('Resource Identifier', shown)).toEqual([articlePage]);
        expect(await view.valueList('Language', shown)).toEqual(['en']);
        await expect(view.values('Relation', shown).getByRole('link')).toHaveAttribute('href', galleyAddress);
        await expectViewFrame(view, address);
        const record = await oai.getRecord(tidalId);
        expectLiveRecord(record, tidalId, 'Tidal Patterns', 'GetRecord');
        const dc = /** @type {any} */ (recordOf(record, tidalId)).dc;
        expect(dc.relation).toEqual([galleyAddress]);
        expect(dc.identifier).toEqual([articlePage]);

        // The browser view: back on ListSets, "Records" of "Articles" lists
        // "Tidal Patterns" (Fields, "The browser view").
        await view.pressQuickLink('ListSets');
        await view.setBlock('Articles').getByRole('link', {name: 'Records', exact: true}).click();
        await view.expectLoaded();
        await expect(view.requestType()).toHaveText('Request was of type ListRecords.');
        await expect(view.recordHeading(tidalId)).toHaveCount(1);
        expect(await view.recordIdentifiers()).toEqual([tidalId]);
        await expectViewFrame(view, address);

        // Control: the second journal's ListRecords lists "Elsewhere" (Rule 3).
        const second = await new OaiRepository(String(baseURL), other).listAll('ListRecords');
        expect(liveTitles(second)).toEqual(['Elsewhere']);
    });

    test('S2: The site-wide address answers for every journal', async ({asUser, ojsApi, page, baseURL}, testInfo) => {
        test.slow();
        const sea = makeTag(2, testInfo);
        const hill = `${sea}h`;
        await seedJournal(ojsApi, sea, {context: {name: 'Sea Letters'}});
        await seedArticle(ojsApi, sea, 'Tidal Patterns', {published: true});
        await seedJournal(ojsApi, hill, {context: {name: 'Hill Notes'}});
        await seedArticle(ojsApi, hill, 'Mountain Air', {published: true});
        const site = new OaiRepository(String(baseURL), SITE_PATH);
        const seaOai = new OaiRepository(String(baseURL), sea);
        const hillOai = new OaiRepository(String(baseURL), hill);
        const view = new OaiView(page);
        const siteLanded = `${baseURL}/index.php/index/en/oai`;

        // Identify: the browser lands on …/index/en/oai, and "Base URL" and
        // "Request URL" read that address; "Repository Name" is empty and
        // "Admin Email" is the site's contact (Rules 16, 19a).
        await view.open(SITE_PATH, 'verb=Identify');
        await expect(page).toHaveURL(`${siteLanded}?verb=Identify`);
        expect(await view.value('Base URL')).toBe(siteLanded);
        expect(await view.value('Request URL')).toBe(siteLanded);
        const identify = await site.identify();
        expect(identify.url).toBe(`${siteLanded}?verb=Identify`);
        expect(identify.identify && identify.identify.baseURL).toBe(siteLanded);
        expect(identify.identify && identify.identify.repositoryName).toBe('');
        expect(await view.value('Repository Name')).toBe('');
        const admin = await actorPage(asUser, 'admin');
        const contactEmail = await siteContactEmail(admin);
        expect(identify.identify && identify.identify.adminEmail).toBe(contactEmail);
        expect(await view.value('Admin Email')).toBe(contactEmail);

        // Each journal's record: its identifier from its own ListRecords,
        // then its Dublin Core record at the site-wide address (Rules 15, 16).
        const tidalId = identifierOfTitle(await seaOai.listAll('ListRecords'), 'Tidal Patterns');
        const mountainId = identifierOfTitle(await hillOai.listAll('ListRecords'), 'Mountain Air');
        expectLiveRecord(await site.getRecord(tidalId), tidalId, 'Tidal Patterns', 'site-wide GetRecord of Tidal Patterns');
        expectLiveRecord(await site.getRecord(mountainId), mountainId, 'Mountain Air', 'site-wide GetRecord of Mountain Air');

        // One journal's set: each journal's path lists its own article and
        // not the other's (Rules 8, 16).
        const seaSet = await site.listRecords({set: sea});
        expect(seaSet.error).toBeNull();
        expect(liveTitles(seaSet)).toContain('Tidal Patterns');
        expect(liveTitles(seaSet)).not.toContain('Mountain Air');
        const hillSet = await site.listRecords({set: hill});
        expect(hillSet.error).toBeNull();
        expect(liveTitles(hillSet)).toContain('Mountain Air');
        expect(liveTitles(hillSet)).not.toContain('Tidal Patterns');

        // Not across journals: "Sea Letters" does not hold "Mountain Air" (Rule 15).
        expectRefusal(await seaOai.getRecord(mountainId), 'idDoesNotExist', M.noIdentifier, 'Sea Letters, Mountain Air');

        // Control: "Hill Notes" does (Rule 15).
        expectLiveRecord(await hillOai.getRecord(mountainId), mountainId, 'Mountain Air', 'Hill Notes, Mountain Air');
    });

    test('S3: Records follow publishing', async ({asUser, ojsApi, baseURL}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag(3, testInfo);
        await seedJournal(ojsApi, tag, {manager: true});
        const tidal = await seedArticle(ojsApi, tag, 'Tidal Patterns', {published: true});
        await seedArticle(ojsApi, tag, 'Coral Reefs', {published: true});
        const oai = new OaiRepository(String(baseURL), tag);
        const site = new OaiRepository(String(baseURL), SITE_PATH);
        const pub = new PublishScreen(await actorPage(asUser, `${tag}mg`), tag);
        const today = utcDate();

        // Before: "Tidal Patterns", then "Coral Reefs" (Rule 6).
        const before = await oai.listAll('ListRecords');
        expect(liveTitles(before)).toEqual(['Tidal Patterns', 'Coral Reefs']);
        const tidalId = identifierOfTitle(before, 'Tidal Patterns');
        const coralId = identifierOfTitle(before, 'Coral Reefs');
        const tidalSets = /** @type {any} */ (recordOf(before, tidalId)).header.setSpecs;
        expectLiveRecord(await site.getRecord(coralId), coralId, 'Coral Reefs', 'Control, before');

        // Unpublished: the site-wide GetRecord shows the same identifier,
        // today's datestamp, the same set, deleted, no metadata (Rule 4).
        await unpublishOnScreen(pub, tidal.submissionId);
        const deleted = await site.getRecord(tidalId);
        expect(deleted.error).toBeNull();
        const gone = recordOf(deleted, tidalId);
        expect(gone, 'the deleted record').toBeTruthy();
        expect(gone && gone.header.deleted).toBe(true);
        // The unpublish may cross midnight UTC after `today` was taken.
        expect(gone && gone.header.datestamp).toMatch(new RegExp(`^(${today}|${utcDate()})T`));
        expect(gone && gone.header.setSpecs).toEqual(tidalSets);
        expect(gone && gone.metadata).toBeNull();
        expectLiveRecord(await site.getRecord(coralId), coralId, 'Coral Reefs', 'Control, unpublished');

        // The journal's own address: "Coral Reefs" listed, "Tidal Patterns"
        // not live (Rule 4b).
        const after = await oai.listAll('ListRecords');
        expect(liveTitles(after)).toEqual(['Coral Reefs']);
        expect(after.records.filter((r) => r.header && r.header.identifier === tidalId && !r.header.deleted)).toEqual([]);

        // Published again: the record is back under the same identifier,
        // not deleted; the journal lists both (Rule 4).
        await publishShown(pub);
        expectLiveRecord(await site.getRecord(tidalId), tidalId, 'Tidal Patterns', 'site-wide GetRecord, published again');
        const again = await oai.listAll('ListRecords');
        expect(liveTitles(again)).toEqual(['Tidal Patterns', 'Coral Reefs']);
        expect(identifierOfTitle(again, 'Tidal Patterns')).toBe(tidalId);

        // Control: "Coral Reefs" throughout (Rule 3).
        expectLiveRecord(await site.getRecord(coralId), coralId, 'Coral Reefs', 'Control, published again');
    });

    test('S4: Refused requests', async ({ojsApi, page, baseURL}, testInfo) => {
        test.slow();
        const tag = makeTag(4, testInfo);
        await seedJournal(ojsApi, tag, {context: {name: 'Sea Letters'}});
        const tidal = await seedArticle(ojsApi, tag, 'Tidal Patterns', {published: true});
        const oai = new OaiRepository(String(baseURL), tag);
        const view = new OaiView(page);
        const repo = await repositoryIdentifierOf(oai);
        const tidalId = oaiIdentifier(repo, KIND, tidal.submissionId);
        expectLiveRecord(await oai.getRecord(tidalId), tidalId, 'Tidal Patterns', 'the identifier as listed');
        const noSuchId = tidalId.replace(/\d+$/, '0');

        // Each refusal: "OAI Error(s)", the sentence, the code and the
        // message, in the XML and on the page (Rules 2, 10, 13, 15; the
        // table "Errors").
        const refusals = [
            ['', 'badVerb', M.badVerb],
            ['verb=identify', 'badVerb', M.badVerb],
            ['verb=ListRecords', 'badArgument', M.missing('metadataPrefix')],
            ['verb=ListSets&metadataPrefix=oai_dc', 'badArgument', M.illegal('metadataPrefix')],
            ['verb=ListRecords&metadataPrefix=jats', 'cannotDisseminateFormat', M.noFormat],
            ['verb=GetRecord&metadataPrefix=oai_dc&identifier=foo', 'badArgument', M.badIdentifier],
            [`verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(noSuchId)}`, 'idDoesNotExist', M.noIdentifier],
            ['verb=ListRecords&resumptionToken=abc', 'badResumptionToken', M.badToken],
            ['verb=ListRecords&resumptionToken=abc&metadataPrefix=oai_dc', 'badArgument', M.illegal('metadataPrefix')],
        ];
        for (const [query, code, message] of refusals) {
            expectRefusal(await oai.read(query), code, message, `?${query}`);
            await view.open(tag, query);
            await expect(view.errorHeading(), `?${query}`).toBeVisible();
            await expect(view.errorIntro(), `?${query}`).toBeVisible();
            expect(await view.value('Error Code'), `?${query}`).toBe(code);
            await expect(view.errorMessage(), `?${query}`).toHaveText(message);
            await expect(view.requestType(), `?${query}: no answer`).toHaveCount(0);
        }

        // Control: Identify still answers (Rule 14).
        await view.open(tag, 'verb=Identify');
        await expect(view.requestType()).toHaveText('Request was of type Identify.');
        expect(await view.value('Repository Name')).toBe('Sea Letters');
        await expect(view.errorHeading()).toHaveCount(0);
    });

    test('S5: Asking by set and by date', async ({ojsApi, baseURL}, testInfo) => {
        test.slow();
        const tag = makeTag(5, testInfo);
        await seedJournal(ojsApi, tag, {
            sections: [{abbrev: 'ART', title: 'Articles'}, {abbrev: 'REV', title: 'Reviews'}],
        });
        await seedArticle(ojsApi, tag, 'Tidal Patterns', {section: 'ART', published: true});
        await seedArticle(ojsApi, tag, 'Hill Review', {section: 'REV', published: true});
        const oai = new OaiRepository(String(baseURL), tag);
        const today = utcDate();
        const tomorrow = utcDate(1);
        const yesterday = utcDate(-1);
        const both = ['Tidal Patterns', 'Hill Review'];
        const list = (args) => oai.listAll('ListRecords', args);
        const none = async (args, what) => expectRefusal(await oai.listRecords(args), 'noRecordsMatch', M.noRecords, what);

        // The journal's set: both, in order, each datestamp today (Rules 4b, 5, 6, 8).
        const journalSet = await list({set: tag});
        expect(journalSet.error).toBeNull();
        expect(liveTitles(journalSet)).toEqual(both);
        expect(journalSet.headers.map((h) => h.datestamp.slice(0, 10))).toEqual([today, today]);

        // A section's set (Rule 8).
        expect(liveTitles(await list({set: `${tag}:ART`}))).toEqual(['Tidal Patterns']);
        expect(liveTitles(await list({set: `${tag}:REV`}))).toEqual(['Hill Review']);

        // A set the journal does not have (Rules 4b, 8).
        await none({set: 'nosuchset'}, 'set=nosuchset');

        // `from` (Rules 4b, 9).
        expect(liveTitles(await list({set: tag, from: today}))).toEqual(both);
        await none({set: tag, from: tomorrow}, 'from tomorrow');

        // `until` (Rules 4b, 9).
        expect(liveTitles(await list({set: tag, until: today}))).toEqual(both);
        await none({set: tag, until: yesterday}, 'until yesterday');

        // Dates written wrong (Rule 9; the table "Errors").
        const [y, m, d] = today.split('-');
        expectRefusal(await oai.listRecords({set: tag, from: `${d}-${m}-${y}`}), 'badArgument', M.illegalFrom, 'from DD-MM-YYYY');
        expectRefusal(await oai.listRecords({set: tag, until: `${y}/${m}/${d}`}), 'badArgument', M.illegalUntil, 'until YYYY/MM/DD');
        expectRefusal(await oai.listRecords({set: tag, from: tomorrow, until: today}), 'badArgument', M.untilBeforeFrom, 'until before from');
        expectRefusal(await oai.listRecords({set: tag, from: today, until: `${today}T23:59:59Z`}), 'badArgument', M.granularity, 'two granularities');

        // Control: a date written right lists both (Rule 9).
        expect(liveTitles(await list({set: tag, from: '2000-01-01'}))).toEqual(both);
    });

    test('S6: A journal closed to visitors, or taken off the site', async ({asUser, ojsApi, page, baseURL}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const sea = makeTag(6, testInfo);
        const hill = `${sea}h`;
        await seedJournal(ojsApi, sea, {context: {name: 'Sea Letters', acronym: 'SL', country: 'CA'}});
        await seedArticle(ojsApi, sea, 'Tidal Patterns', {published: true});
        await seedJournal(ojsApi, hill, {context: {name: 'Hill Notes'}, restrictSiteAccess: true});
        await seedArticle(ojsApi, hill, 'Mountain Air', {published: true});
        const seaOai = new OaiRepository(String(baseURL), sea);
        const site = new OaiRepository(String(baseURL), SITE_PATH);
        const view = new OaiView(page);
        const loginOf = (path) => new RegExp(`/index\\.php/${path}/login(\\?|$)`);
        const loginForm = page.locator('input#username');

        // Sign-in required: the Login page opens in place of the answer
        // (Rule 18; Settings bullet 8).
        for (const query of ['verb=Identify', 'verb=ListRecords&metadataPrefix=oai_dc']) {
            await page.goto(`/index.php/${hill}/oai?${query}`);
            await expect(page, query).toHaveURL(loginOf(hill));
            await expect(loginForm, query).toBeVisible();
            await expect(view.heading, query).toHaveCount(0);
        }

        // Control, before the untick: Identify names "Sea Letters" (Rule 18).
        await view.open(sea, 'verb=Identify');
        expect(await view.value('Repository Name')).toBe('Sea Letters');
        await expect(loginForm).toHaveCount(0);

        // Before: the identifier from the journal's list, and its record at
        // the site-wide address.
        const tidalId = identifierOfTitle(await seaOai.listAll('ListRecords'), 'Tidal Patterns');
        expectLiveRecord(await site.getRecord(tidalId), tidalId, 'Tidal Patterns', 'site-wide GetRecord, before');

        // Taken off the site: the Site Administrator unticks "Enable this
        // journal to appear publicly on the site" and saves; the journal's
        // address sends the visitor to Login, and the site-wide record is
        // deleted (Rules 16b, 18; Settings bullet 10).
        const admin = await actorPage(asUser, 'admin');
        const edit = new HostedContextEditWindow(admin, HOSTED);
        await edit.open(sea);
        expect(await edit.publicBoxLabel()).toBe('Enable this journal to appear publicly on the site');
        await expect(edit.publicBox).toBeChecked();
        await edit.publicBox.uncheck();
        expect((await edit.save()).status(), 'the Edit window saves').toBe(200);
        await expect(edit.publicBox).toHaveCount(0);
        await page.goto(`/index.php/${sea}/oai?verb=Identify`);
        await expect(page).toHaveURL(loginOf(sea));
        await expect(loginForm).toBeVisible();
        const off = await site.getRecord(tidalId);
        expect(off.error).toBeNull();
        const offRecord = recordOf(off, tidalId);
        expect(offRecord, 'the record, off the site').toBeTruthy();
        expect(offRecord && offRecord.header.deleted).toBe(true);
        expect(offRecord && offRecord.metadata).toBeNull();

        // Back on the site: ticked and saved, the record is live again under
        // the same identifier and Identify names "Sea Letters" (Rule 16b).
        await edit.open(sea);
        await expect(edit.publicBox).not.toBeChecked();
        await edit.publicBox.check();
        expect((await edit.save()).status(), 'the Edit window saves').toBe(200);
        await expect(edit.publicBox).toHaveCount(0);
        expectLiveRecord(await site.getRecord(tidalId), tidalId, 'Tidal Patterns', 'site-wide GetRecord, back on the site');
        await view.open(sea, 'verb=Identify');
        expect(await view.value('Repository Name')).toBe('Sea Letters');
        await expect(loginForm).toHaveCount(0);
    });

    test('S7: "Enable OAI" withholds a journal\'s records', async ({asUser, ojsApi, baseURL}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag(7, testInfo);
        await seedJournal(ojsApi, tag, {manager: true, context: {name: 'Sea Letters'}});
        await seedArticle(ojsApi, tag, 'Tidal Patterns', {published: true});
        const coral = await seedArticle(ojsApi, tag, 'Coral Reefs', {published: true});
        const oai = new OaiRepository(String(baseURL), tag);
        const site = new OaiRepository(String(baseURL), SITE_PATH);
        const manager = await actorPage(asUser, `${tag}mg`);
        const field = new EnableOaiField(manager, tag, new AccessSettings(manager, tag));

        // The field: after "Publishing Mode", with its help line, "Enable"
        // chosen (Fields, "Enable OAI").
        await field.goto();
        const groups = await field.groupNames();
        expect(groups.indexOf(O.enableOai)).toBe(groups.indexOf('Publishing Mode') + 1);
        expect(await field.groupLines()).toEqual([O.enableOai, O.enableOaiHelp, 'Enable', 'Disable']);
        await expect(field.radio('Enable')).toBeChecked();
        await expect(field.radio('Disable')).not.toBeChecked();

        // A deleted record first: the identifiers, then "Coral Reefs" unpublished.
        const list = await oai.listAll('ListRecords');
        const tidalId = identifierOfTitle(list, 'Tidal Patterns');
        const coralId = identifierOfTitle(list, 'Coral Reefs');
        await unpublishOnScreen(new PublishScreen(manager, tag), coral.submissionId);

        // Control, before "Disable": the journal's GetRecord of "Tidal Patterns" (Rule 17).
        expectLiveRecord(await oai.getRecord(tidalId), tidalId, 'Tidal Patterns', 'journal GetRecord, before');

        // "Disable": the record leaves both addresses; Identify and ListSets
        // answer as before (Rule 17; Settings bullet 1).
        await field.goto();
        expect((await field.choose('Disable')).status()).toBe(200);
        expectRefusal(await oai.getRecord(tidalId), 'idDoesNotExist', M.noIdentifier, 'journal GetRecord, disabled');
        expectRefusal(await site.getRecord(tidalId), 'idDoesNotExist', M.noIdentifier, 'site-wide GetRecord, disabled');
        expectRefusal(await oai.listMetadataFormats(tidalId), 'idDoesNotExist', M.noIdentifier, 'ListMetadataFormats, disabled');
        const identify = await oai.identify();
        expect(identify.identify && identify.identify.repositoryName).toBe('Sea Letters');
        expect((await oai.listSets()).sets).toContainEqual({spec: tag, name: 'Sea Letters'});

        // Deleted records stay: the site-wide GetRecord of "Coral Reefs" (Rule 17a).
        const coralRecord = recordOf(await site.getRecord(coralId), coralId);
        expect(coralRecord, 'the deleted record of Coral Reefs').toBeTruthy();
        expect(coralRecord && coralRecord.header.deleted).toBe(true);

        // "Enable" again: the record is back under the same identifier (Rule 17).
        await field.goto();
        await expect(field.radio('Disable')).toBeChecked();
        expect((await field.choose('Enable')).status()).toBe(200);
        expectLiveRecord(await oai.getRecord(tidalId), tidalId, 'Tidal Patterns', 'journal GetRecord, enabled again');
    });

    test('S8: A journal\'s MARC records', async ({ojsApi, page, baseURL}, testInfo) => {
        test.slow();
        const tag = makeTag(8, testInfo);
        const issue = {volume: 1, number: 2, year: 2026};
        await seedJournal(ojsApi, tag, {
            context: {name: 'Sea Letters'},
            sections: [{abbrev: 'ART', title: 'Articles', identifyType: 'Research Article'}],
            issues: [{...issue, published: true}],
        });
        const tidal = await seedArticle(ojsApi, tag, 'Tidal Patterns', {
            subtitle: 'A Study',
            abstract: 'Tides follow the moon.',
            disciplines: ['Marine Science'],
            subjects: ['Oceanography'],
            articleNumber: 'e0142',
            published: true,
            issue,
            galleys: PDF,
        });
        await seedArticle(ojsApi, tag, 'Loose Notes', {published: true, galleys: PDF});
        const oai = new OaiRepository(String(baseURL), tag);
        const view = new OaiView(page);
        const today = utcDate();
        const articlePage = `${baseURL}/index.php/${tag}/article/view/${tidal.submissionId}`;

        // The formats (Rule 10).
        expect(prefixes(await oai.listMetadataFormats())).toEqual(OAI_FORMATS);

        // `marcxml`: "Unknown Metadata Format" with the XML as text, and the
        // fields by number (Rule 12; the table "The MARC records").
        const list = await oai.listAll('ListRecords');
        const tidalId = identifierOfTitle(list, 'Tidal Patterns: A Study');
        const looseId = identifierOfTitle(list, 'Loose Notes');
        await view.open(tag, {verb: 'GetRecord', metadataPrefix: 'marcxml', identifier: tidalId});
        await expect(page.getByRole('heading', {name: O.unknownFormat, exact: true})).toBeVisible();
        await expect(view.record(tidalId).locator('.xmlSource')).toContainText('Tidal Patterns');
        const marcAnswer = await oai.getRecord(tidalId, 'marcxml');
        expect(marcAnswer.error).toBeNull();
        const marcRecord = recordOf(marcAnswer, tidalId);
        const marc = parseMarc(String(marcRecord && marcRecord.metadata));
        const f = (tag_) => marcValues(marc, tag_);
        expect(f('042')).toEqual([['dc']]);
        expect(f('100')).toEqual([['Author, Ada']]);
        expect(f('245')).toEqual([['Tidal Patterns']]);
        expect(f('245').flat().join(' ')).not.toContain('A Study');
        expect(f('251')).toEqual([['Version of Record 1.0']]);
        expect(f('260')[0]).toEqual(['Sea Letters']);
        expect(f('260').slice(1).flat()).toHaveLength(1);
        expect(f('260').slice(1).flat()[0]).toMatch(new RegExp(`^${today}`));
        expect(f('520')).toEqual([['Tides follow the moon.']]);
        expect(f('546')).toEqual([['eng']]);
        expect(f('653')).toEqual([['Marine Science'], ['Oceanography']]);
        expect(f('655')).toEqual([['Research Article']]);
        expect(f('773')).toEqual([['Sea Letters;', 'Vol. 1 No. 2 (2026), e0142']]);
        expect(f('856')).toEqual([['application/pdf'], [articlePage]]);

        // `oai_marc`: the same fields with the same values (008 not read, A15).
        const oaiMarcRecord = recordOf(await oai.getRecord(tidalId, 'oai_marc'), tidalId);
        const oaiMarc = parseMarc(String(oaiMarcRecord && oaiMarcRecord.metadata));
        const byValue = (fields) => fields.filter((x) => x.tag !== '008').map((x) => [x.tag, x.subfields.map((s) => s.value)]);
        expect(byValue(oaiMarc)).toEqual(byValue(marc));
        expect(byValue(marc).length).toBeGreaterThan(10);

        // In no issue: 773 without the issue, 260 without a date (Rule 12).
        const looseRecord = recordOf(await oai.getRecord(looseId, 'marcxml'), looseId);
        const loose = parseMarc(String(looseRecord && looseRecord.metadata));
        expect(marcValues(loose, '773')).toEqual([['Sea Letters;']]);
        expect(marcValues(loose, '260')).toEqual([['Sea Letters']]);

        // Its Dublin Core record (the table "The Dublin Core record";
        // Settings bullets 11, 13).
        const dcAnswer = await oai.getRecord(tidalId);
        expectLiveRecord(dcAnswer, tidalId, 'Tidal Patterns: A Study', 'oai_dc GetRecord');
        const dc = /** @type {any} */ (recordOf(dcAnswer, tidalId)).dc;
        expect(dc.subject).toEqual(['Oceanography']);
        expect(sorted(dc.type)).toEqual(sorted(['info:eu-repo/semantics/article', 'Research Article', 'info:eu-repo/semantics/publishedVersion']));
        expect(dc.source).toEqual(['Sea Letters; Vol. 1 No. 2 (2026); e0142']);

        // Control: no discipline or subject reads "Array" (Rules 11, 12),
        // beside the names the records do carry.
        for (const [name, metadata] of [['marcxml', marcRecord && marcRecord.metadata], ['oai_marc', oaiMarcRecord && oaiMarcRecord.metadata],
            ['oai_dc', /** @type {any} */ (recordOf(dcAnswer, tidalId)).metadata]]) {
            expect(metadata, name).toContain('Oceanography');
            expect(metadata, name).not.toContain('Array');
        }
    });

    test('S9: The JATS format and its window', async ({asUser, ojsApi, page, baseURL}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag(9, testInfo);
        await seedJournal(ojsApi, tag, {manager: true, context: {name: 'Sea Letters'}});
        const tidal = await seedArticle(ojsApi, tag, 'Tidal Patterns', {published: true, galleys: PDF});
        const marked = await seedArticle(ojsApi, tag, 'Marked Tides', {published: true, galleys: XML});
        const oai = new OaiRepository(String(baseURL), tag);
        const view = new OaiView(page);
        const repo = await repositoryIdentifierOf(oai);
        const tidalId = oaiIdentifier(repo, KIND, tidal.submissionId);
        const markedId = oaiIdentifier(repo, KIND, marked.submissionId);
        const authorEmail = `${tag}au@mail.test`;
        const jatsOf = async (identifier) => {
            const answer = await oai.getRecord(identifier, 'jats');
            expect(answer.error, `the jats record of ${identifier}`).toBeNull();
            const record = recordOf(answer, identifier);
            return String(record && record.metadata);
        };
        const bodyOf = (jats) => (jats.match(/<body>([\s\S]*?)<\/body>/) || [])[1] || '';

        // Control: before the tick, no "jats", and a `jats` GetRecord is
        // refused (Rules 10, 21).
        expect(prefixes(await oai.listMetadataFormats())).toEqual(OAI_FORMATS);
        expectRefusal(await oai.getRecord(tidalId, 'jats'), 'cannotDisseminateFormat', M.noFormat, 'jats before the tick');
        expectLiveRecord(await oai.getRecord(tidalId), tidalId, 'Tidal Patterns', 'oai_dc before the tick');

        // The plugin rows: the three formats ticked and not pressable, "JATS
        // Metadata Format" unticked (Actors row 4; the table "The formats").
        const manager = await actorPage(asUser, `${tag}mg`);
        const grid = new PluginGrid(manager, tag);
        await grid.goto();
        for (const name of ['DC Metadata Format', 'MARC Metadata Format', 'MARC21 Metadata Format', 'JATS Metadata Format']) {
            await expect(grid.row(name), name).toHaveCount(1);
            expect(await grid.categoryOf(name), name).toBe('OAI Metadata Format Plugins');
        }
        for (const name of ['DC Metadata Format', 'MARC Metadata Format', 'MARC21 Metadata Format']) {
            await expect(grid.box(name), name).toBeChecked();
            await expect(grid.box(name), name).toBeDisabled();
        }
        await expect(grid.box('JATS Metadata Format')).not.toBeChecked();
        await expect(grid.box('JATS Metadata Format')).toBeEnabled();

        // Enabled: "jats" is offered, and the record of "Tidal Patterns" is
        // a JATS document: its title, this year, "en", no email address of
        // Ada Author (Rule 21; the JATS record).
        expect(await grid.setEnabled('JATS Metadata Format', true)).toBeNull();
        expect(prefixes(await oai.listMetadataFormats())).toEqual(sorted(['jats', ...OAI_FORMATS]));
        await view.open(tag, {verb: 'GetRecord', metadataPrefix: 'jats', identifier: tidalId});
        await expect(page.getByRole('heading', {name: O.unknownFormat, exact: true})).toBeVisible();
        await expect(view.record(tidalId).locator('.xmlSource')).toContainText('Tidal Patterns');
        const tidalJats = await jatsOf(tidalId);
        expect(tidalJats).toMatch(/^<article [^>]*xml:lang="en"/);
        expect(tidalJats).toMatch(/<article-title[^>]*>Tidal Patterns<\/article-title>/);
        expect(tidalJats).toContain(`<pub-date date-type="collection"><year>${new Date().getUTCFullYear()}</year></pub-date>`);
        expect(tidalJats).toContain('<surname>Author</surname><given-names>Ada</given-names>');
        expect(tidalJats).not.toContain(authorEmail);
        expect(tidalJats).not.toContain('<email>');

        // An XML galley: the body and back matter of the galley (Rule 22).
        const markedJats = await jatsOf(markedId);
        expect(bodyOf(markedJats)).toContain('<sec id="s1">');
        expect(bodyOf(markedJats)).toContain('<p>The body text of the JATS fixture, one paragraph.</p>');
        expect(markedJats).toMatch(/<back>[\s\S]*<ref-list>[\s\S]*Author A\. A cited work\.[\s\S]*<\/back>/);

        // The window (Fields; Side effects).
        await grid.goto();
        await grid.openSettings('JATS Metadata Format');
        const window = new JatsFormatWindow(manager);
        await window.waitOpen();
        await expect(window.title).toHaveText('JATS Metadata Format');
        expect(await window.text()).toContain(O.jatsWindowDescription);
        await expect(window.formHeading('Settings')).toBeVisible();
        await expect(window.labelledBox()).not.toBeChecked();
        await expect(window.okButton).toBeVisible();
        await expect(window.cancelLink).toBeVisible();
        await window.labelledBox().check();
        await window.okAccepted();

        // Uploaded XML ignored: the galley's whole text in one paragraph, no
        // back matter (Rule 22; Settings bullet 3).
        const ignored = await jatsOf(markedId);
        const body = bodyOf(ignored);
        expect(body.match(/<p>/g) || []).toHaveLength(1);
        expect(body).not.toContain('<sec');
        for (const text of ['Journal of Public Knowledge', 'A JATS fixture article', 'The body text of the JATS fixture, one paragraph.',
            'Author A. A cited work.']) {
            expect(body, text).toContain(text);
        }
        expect(ignored).not.toContain('<back>');
        expect(ignored).toMatch(/<article-title[^>]*>Marked Tides<\/article-title>/);

        // The template switched off: `jats` refused, still offered (Rule 21b;
        // Settings bullet 4).
        await grid.goto();
        expect(await grid.categoryOf('JATS Template Plugin')).toBe('Generic Plugins');
        expect(await grid.setEnabled('JATS Template Plugin', false)).toContain(O.disableQuestion);
        expectRefusal(await oai.getRecord(tidalId, 'jats'), 'cannotDisseminateFormat', M.jatsUnavailable, 'jats, template off');
        expect(prefixes(await oai.listMetadataFormats())).toContain('jats');
        expectLiveRecord(await oai.getRecord(tidalId), tidalId, 'Tidal Patterns', 'oai_dc, template off');
    });

    test('S10: A journal that sells subscriptions, and one that does not publish online', async ({ojsApi, page, baseURL}, testInfo) => {
        test.slow();
        const paid = makeTag(10, testInfo);
        const print = `${paid}p`;
        const first = {volume: 1, number: 1, year: 2026};
        const second = {volume: 1, number: 2, year: 2026};
        await seedJournal(ojsApi, paid, {
            context: {name: 'Paid Letters'},
            publishingMode: 'subscription',
            plugins: {oaimetadataformatplugin_jats: {enabled: true}, driverplugin: {enabled: true}},
            issues: [{...first, published: true, accessStatus: 'open'}, {...second, published: true}],
        });
        const open = await seedArticle(ojsApi, paid, 'Open Tides', {published: true, issue: first, galleys: PDF});
        const closed = await seedArticle(ojsApi, paid, 'Closed Tides', {published: true, issue: second, galleys: PDF});
        const opened = await seedArticle(ojsApi, paid, 'Opened Tides', {published: true, issue: second, galleys: PDF, accessStatus: 'open'});
        await seedJournal(ojsApi, print, {context: {name: 'Print Letters'}, publishingMode: 'none'});
        const paper = await seedArticle(ojsApi, print, 'Paper Tides', {published: true, galleys: PDF});
        const oai = new OaiRepository(String(baseURL), paid);
        const printOai = new OaiRepository(String(baseURL), print);
        const view = new OaiView(page);
        const repo = await repositoryIdentifierOf(oai);
        const id = (item) => oaiIdentifier(repo, KIND, item.submissionId);

        // The `driver` set (Rule 23; Settings bullet 5).
        expect((await oai.listSets()).sets).toContainEqual({spec: 'driver', name: 'Open Access DRIVERset'});

        // Its members: "Open Tides" and "Opened Tides", each also in
        // "driver", not "Closed Tides"; the list's first part only (A24)
        // (Rule 23; Settings bullet 7).
        const driver = await oai.listRecords({set: 'driver'});
        expect(driver.error).toBeNull();
        const members = driver.records.map((r) => r.header && r.header.identifier);
        expect(members).toContain(id(open));
        expect(members).toContain(id(opened));
        expect(members).not.toContain(id(closed));
        for (const item of [open, opened]) {
            const member = recordOf(driver, id(item));
            expect(member && member.header.setSpecs).toEqual([`${paid}:ART`, 'driver']);
        }

        // Refused in `jats`: the two articles of the subscription issue; the
        // jats ListIdentifiers lists "Closed Tides" like the others (Rule 21a).
        expectRefusal(await oai.getRecord(id(closed), 'jats'), 'cannotDisseminateFormat', M.jatsRefused, 'jats, Closed Tides');
        expectRefusal(await oai.getRecord(id(opened), 'jats'), 'cannotDisseminateFormat', M.jatsRefused, 'jats, Opened Tides');
        const jatsHeaders = (await oai.listAll('ListIdentifiers', {metadataPrefix: 'jats'})).headers.map((h) => h.identifier);
        for (const item of [open, closed, opened]) expect(jatsHeaders).toContain(id(item));

        // Served in `jats`: "Open Tides" (Rule 21a).
        await view.open(paid, {verb: 'GetRecord', metadataPrefix: 'jats', identifier: id(open)});
        await expect(page.getByRole('heading', {name: O.unknownFormat, exact: true})).toBeVisible();
        await expect(view.record(id(open)).locator('.xmlSource')).toContainText('Open Tides');
        const served = await oai.getRecord(id(open), 'jats');
        expect(served.error).toBeNull();
        const servedRecord = recordOf(served, id(open));
        expect(servedRecord && servedRecord.metadata).toMatch(/<article-title[^>]*>Open Tides<\/article-title>/);

        // Not published online: "Paper Tides" has a record, and neither
        // "Resource Identifier" nor "Relation" carries an address of the
        // journal, where "Open Tides" carries both (Rule 11a; Settings
        // bullet 7).
        const paperAnswer = await printOai.getRecord(id(paper));
        expectLiveRecord(paperAnswer, id(paper), 'Paper Tides', 'Print Letters, Paper Tides');
        const paperDc = /** @type {any} */ (recordOf(paperAnswer, id(paper))).dc;
        const printAddress = `${baseURL}/index.php/${print}/`;
        expect([...paperDc.identifier, ...paperDc.relation].filter((v) => v.includes(printAddress))).toEqual([]);
        expect(paperDc.format).toEqual(['application/pdf']);
        const openDc = /** @type {any} */ (recordOf(await oai.getRecord(id(open)), id(open))).dc;
        expect(openDc.identifier).toContain(`${baseURL}/index.php/${paid}/article/view/${open.submissionId}`);
        expect(openDc.relation.filter((v) => v.startsWith(`${baseURL}/index.php/${paid}/article/view/${open.submissionId}/`))).toHaveLength(1);

        // Control: "Closed Tides" in Dublin Core (Rules 3, 21a).
        expectLiveRecord(await oai.getRecord(id(closed)), id(closed), 'Closed Tides', 'oai_dc, Closed Tides');
    });
});
