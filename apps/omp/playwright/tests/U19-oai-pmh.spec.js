// @ts-check
/**
 * @file playwright/tests/U19-oai-pmh.spec.js
 *
 * OAI-PMH — OMP suite, one test per canonical scenario a press runs: S1–S6,
 * common to the three apps, in the press's own words (Press Manager,
 * "Hosted Presses", a book's page at `catalog/book/{id}`, one record per
 * publication format, "oai:{repository identifier}:publicationFormat/{n}",
 * Dublin Core the only format, the press its only set). The {OMP} bullets
 * ride inline: S1's two records of a book with two formats and none for a
 * book with no format (OMP1). S4's "Nothing to list" is {OPS}: a press's own
 * address lists the first press's deleted records (A1, Rule 4b).
 * S7 has no press analogue (a press has no "Enable OAI", OMP2); S8–S10 are
 * {OJS}. The {OJS OPS} bullets (keywords, "Publisher", "Relation", a
 * section's set, an unknown set) are not run here.
 * Spec: docs/specs/U19-oai-pmh.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1 🐞: no press's unfiltered list is asserted complete or empty; S3
 *   reads "Tidal Patterns" as no longer live at the press's address, never
 *   as missing there, and never reads the press's GetRecord of it.
 * - A2 🐞, A3 🐞, A20 🐞: S5 gives whole days only, all in the calendar.
 * - A4 🐞: no last part's "Resume" is read.
 * - A5 🐞: no ListMetadataFormats with an identifier is opened in the browser.
 * - A8 🐞, A13 🐞: no "Source" is read; nothing is read in French.
 * - A16 🐞, A17: no argument is given twice; S4's malformed identifier is
 *   "foo".
 * - A18 🐞: S3 never reads the datestamp of the record published again.
 * - OMP3 🐞: no unknown set is asked of a press.
 * - OMP6 🐞: no series (a scratch press has none).
 * - OMP7 ❓: no new version is published.
 * - A6–A15, A19–A24, OJS-only: the journal's, in that suite; OPS*: the
 *   preprint server's.
 *
 * Seeding: scenario endpoints only, as footnote s says; publicknowledge and
 * the seeded roster are only read. Every scenario runs on its own scratch
 * presses, each path the test's unique tag (plus a letter), one language,
 * with throwaway accounts (the username twice as password): an Author "Ada
 * Author" who submits every book, a Press Manager in S3; S6's Site
 * Administrator is `admin`. Books are published by the submission scenario
 * (`published`, no `datePublished`), so every datestamp and "Date" is
 * today, UTC; each book a record is read of carries a format through
 * `publicationFormats[]` (`{name: 'PDF', file: 'article.pdf'}`, S1's
 * "Tidal Patterns" also `{name: 'EPUB'}`), which builds it available to
 * readers. S6 passes `restrictSiteAccess` and seeds the press's `country`
 * and `acronym`, so the Hosted Presses "Edit" window saves without a
 * Country picked on screen; the unpublish and second publish (S3) and the
 * Hosted Presses window (S6) are the screens'.
 *
 * Reading: the visitor is the fixture `page` (no user: signed out). The OAI
 * answers are read raw through OaiPages' OaiRepository, a fresh request
 * context per read (no session, no language cookie, redirects followed),
 * and the browser view ("OAI 2.0 Request Results") is opened in the
 * visitor's page where a scenario reads the page itself (S1, the refusals
 * of S4, the Login pages of S6). A press's unfiltered list is walked
 * through every part ("Resume"). The site-wide address lists every context
 * on the install: its reads are GetRecord and `set`-filtered lists of the
 * scenario's own presses. Every absence is read on a settled answer (a
 * whole server response) beside a positive control taken the same way
 * (M4, M6). Everything here runs in the parallel `omp` project: every
 * setting changed is a scratch press's own.
 */
const {test, expect} = require('../support/fixtures.js');
const {
    SITE_PATH,
    OAI_TEXT: O,
    oaiIdentifier,
    utcDate,
    recordOf,
    liveTitles,
    OaiRepository,
    OaiView,
    HostedContextEditWindow,
    siteContactEmail,
} = require('../../../../shared/playwright/pages/OaiPages.js');
const {unpublishFromWorkflow} = require('../pages/PublicationPages.js');

const M = O.messages;
const KIND = 'publicationFormat';
const PDF = [{name: 'PDF', file: 'article.pdf'}];
const HOSTED = {hostedLabel: 'Hosted Presses'};
const ON_PRESS_FORMAT = 'Digital (on physical carrier) (DA)';

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u19s${scenario}omw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: `${username}@mail.test`, roles};
}

/**
 * A scratch press with the throwaway Author (`${tag}au`, Ada Author) and,
 * with `manager`, a Press Manager (`${tag}mg`), plus context keys.
 */
async function seedPress(ompApi, tag, {manager = false, ...keys} = {}) {
    return ompApi.createContext({
        tag,
        users: [
            ...(manager ? [user(`${tag}mg`, 'Mona', 'Manager', ['manager'])] : []),
            user(`${tag}au`, 'Ada', 'Author', ['author']),
        ],
        ...keys,
    });
}

/** A book submitted by the press's Author; returns the createSubmission answer. */
async function seedBook(ompApi, tag, title, extra = {}) {
    return ompApi.createSubmission({
        tag: `${tag}${title.replace(/[^A-Za-z]/g, '').slice(0, 6).toLowerCase()}`,
        context: tag,
        submitter: `${tag}au`,
        title,
        ...extra,
    });
}

/** A published book with one available "PDF" format. */
function seedPublishedBook(ompApi, tag, title, extra = {}) {
    return seedBook(ompApi, tag, title, {published: true, publicationFormats: PDF, ...extra});
}

/** The page of a signed-in actor (its own `asUser` context). */
async function actorPage(asUser, username) {
    return (await asUser(username)).newPage();
}

/** Sorted copy. */
const sorted = (list) => [...list].sort();

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

/** The repository identifier the press's Identify names. */
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

// ---------------------------------------------------------------------------
// The press's workflow: unpublish and publish again (U49's screens)
// ---------------------------------------------------------------------------

/** Open a book's workflow on its "Title & Abstract" page, the version shown "Published". */
async function openPublishedBook(page, contextPath, submissionId) {
    await page.goto(`/index.php/${contextPath}/dashboard/editorial?workflowSubmissionId=${submissionId}`);
    await expect(page.getByRole('link', {name: 'Publication', exact: true})).toBeVisible({timeout: 30_000});
    const link = page.getByRole('link', {name: 'Title & Abstract', exact: true}).first();
    if (!(await link.isVisible())) {
        await page.getByRole('link', {name: 'Publication', exact: true}).click();
    }
    await link.click();
    await expect(page.getByRole('heading', {name: 'Publication: Title & Abstract'})).toBeVisible({timeout: 30_000});
    await expectStatus(page, 'Published');
}

/** The Publication head's status readout. */
async function expectStatus(page, label) {
    await expect(page.locator('div:has(> span:text-is("Status:"))')).toContainText(label, {timeout: 30_000});
}

/** "Publish", its "Schedule For Publication" window, and that window's "Publish". */
async function publishShown(page) {
    await page.getByRole('button', {name: 'Publish', exact: true}).click();
    const modal = page.getByRole('dialog', {name: /Schedule For Publication/});
    await expect(modal).toBeVisible({timeout: 30_000});
    const published = page.waitForResponse((r) => r.url().includes('/publish') && r.ok(), {timeout: 30_000});
    await modal.getByRole('button', {name: 'Publish', exact: true}).click();
    await published;
    await expect(page.getByRole('button', {name: 'Unpublish', exact: true})).toBeVisible({timeout: 30_000});
    await expectStatus(page, 'Published');
}

test.describe('OAI-PMH', () => {
    test('S1: A harvester reads a journal\'s address', async ({ompApi, page, baseURL}, testInfo) => {
        test.slow();
        const tag = makeTag(1, testInfo);
        const other = `${tag}b`;
        await seedPress(ompApi, tag, {
            context: {name: 'Sea Letters', contactName: 'Pat Contact', contactEmail: 'pat.contact@example.org'},
        });
        const tidal = await seedBook(ompApi, tag, 'Tidal Patterns', {
            abstract: 'Tides follow the moon.',
            published: true,
            publicationFormats: [{name: 'PDF', file: 'article.pdf'}, {name: 'EPUB'}],
        });
        await seedBook(ompApi, tag, 'Bare Book', {published: true});
        await seedBook(ompApi, tag, 'Draft Study');
        await seedPress(ompApi, other);
        const elsewhere = await seedPublishedBook(ompApi, other, 'Elsewhere');
        const oai = new OaiRepository(String(baseURL), tag);
        const address = oai.address();
        const view = new OaiView(page);
        const today = utcDate();
        const bookPage = `${baseURL}/index.php/${tag}/catalog/book/${tidal.submissionId}`;
        const formatIds = tidal.publicationFormats.map((f) => f.id);
        expect(formatIds, 'the two formats seeded').toHaveLength(2);

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
        await expect(page.locator('body')).toContainText('Open Monograph Press');
        await expectViewFrame(view, address);
        const tidalIds = formatIds.map((id) => oaiIdentifier(repo, KIND, id));
        const elsewhereIds = elsewhere.publicationFormats.map((f) => oaiIdentifier(repo, KIND, f.id));

        // ListSets: the press alone (Rule 7).
        await view.pressQuickLink('ListSets');
        await expect(view.requestType()).toHaveText('Request was of type ListSets.');
        await expect(view.setBlocks()).toHaveCount(1);
        expect(await view.setSpecs(view.setBlock('Sea Letters'))).toEqual([tag]);
        expect((await oai.listSets()).sets).toEqual([{spec: tag, name: 'Sea Letters'}]);
        await expectViewFrame(view, address);

        // ListMetadataFormats: "oai_dc" alone (Rule 10; the table "The formats").
        await view.pressQuickLink('ListMetadataFormats');
        await expect(view.requestType()).toHaveText('Request was of type ListMetadataFormats.');
        await expect(page.getByText(O.formatsIntro, {exact: true})).toBeVisible();
        await expect(view.formatBlocks()).toHaveCount(1);
        expect(await view.valueList('metadataPrefix')).toEqual(['oai_dc']);
        await expectViewFrame(view, address);

        // ListRecords: the record of "Tidal Patterns" under its format's
        // identifier, the press's path as its setSpec (Rules 3, 7d; the
        // table "A record's header").
        await view.pressQuickLink('ListRecords');
        await expect(view.requestType()).toHaveText('Request was of type ListRecords.');
        await expectViewFrame(view, address);
        const block = await view.findRecord(tidalIds[0]);
        expect(await view.identifierIn(block)).toBe(tidalIds[0]);
        expect(await view.setSpecs(block)).toEqual([tag]);
        const list = await oai.listAll('ListRecords');

        // A press's records: two for "Tidal Patterns", one per format, each
        // "…:publicationFormat/{n}"; none for "Bare Book" (Rule 3a, OMP1).
        const tidalRecords = list.records.filter((r) => r.header && !r.header.deleted && r.dc && r.dc.title[0] === 'Tidal Patterns');
        expect(sorted(tidalRecords.map((r) => r.header.identifier))).toEqual(sorted(tidalIds));
        for (const record of tidalRecords) {
            expect(record.header.identifier).toMatch(new RegExp(`^oai:${repo.replace(/\./g, '\\.')}:publicationFormat/\\d+$`));
            expect(record.header.setSpecs).toEqual([tag]);
        }

        // Not listed: "Bare Book", "Draft Study" and "Elsewhere", beside
        // "Tidal Patterns" (Rule 3).
        const titles = list.records.filter((r) => r.dc).flatMap((r) => r.dc.title);
        expect(titles).toContain('Tidal Patterns');
        for (const absent of ['Bare Book', 'Draft Study', 'Elsewhere']) {
            expect(titles, `${absent} listed`).not.toContain(absent);
        }
        const identifiers = list.headers.map((h) => h.identifier);
        for (const id of tidalIds) expect(identifiers).toContain(id);
        for (const id of elsewhereIds) expect(identifiers, 'Elsewhere\'s identifier listed').not.toContain(id);
        expect(list.records.filter((r) => r.header && r.header.setSpecs.includes(tag))).toHaveLength(2);

        // GetRecord: the header's "oai_dc" opens the Dublin Core record
        // (Rule 11; the table "The Dublin Core record").
        await block.getByRole('link', {name: 'oai_dc', exact: true}).click();
        await view.expectLoaded();
        await expect(view.requestType()).toHaveText('Request was of type GetRecord.');
        await expect(view.recordHeading(tidalIds[0])).toHaveCount(1);
        await expect(page.getByRole('heading', {name: O.dcHeading, exact: true})).toBeVisible();
        const shown = view.record(tidalIds[0]);
        expect(await view.valueList('Title', shown)).toEqual(['Tidal Patterns']);
        expect(await view.valueList('Author or Creator', shown)).toEqual(['Author, Ada']);
        expect(await view.valueList('Description', shown)).toEqual(['Tides follow the moon.']);
        expect(await view.valueList('Date', shown)).toEqual([today]);
        expect(await view.valueList('Resource Type', shown)).toEqual(['Book']);
        expect(await view.valueList('Format', shown)).toEqual([ON_PRESS_FORMAT]);
        expect(await view.valueList('Resource Identifier', shown)).toEqual([bookPage]);
        expect(await view.valueList('Language', shown)).toEqual(['eng']);
        await expectViewFrame(view, address);
        for (const id of tidalIds) {
            const record = await oai.getRecord(id);
            expectLiveRecord(record, id, 'Tidal Patterns', `GetRecord ${id}`);
            const dc = /** @type {any} */ (recordOf(record, id)).dc;
            expect(dc.type).toEqual(['Book']);
            expect(dc.format).toEqual([ON_PRESS_FORMAT]);
            expect(dc.identifier).toEqual([bookPage]);
            expect(dc.language).toEqual(['eng']);
        }

        // The browser view: back on ListSets, "Records" of the press lists
        // "Tidal Patterns" (Fields, "The browser view").
        await view.pressQuickLink('ListSets');
        await view.setBlock('Sea Letters').getByRole('link', {name: 'Records', exact: true}).click();
        await view.expectLoaded();
        await expect(view.requestType()).toHaveText('Request was of type ListRecords.');
        for (const id of tidalIds) await expect(view.recordHeading(id)).toHaveCount(1);
        expect(sorted(await view.recordIdentifiers())).toEqual(sorted(tidalIds));
        expect(await view.valueList('Title')).toEqual(['Tidal Patterns', 'Tidal Patterns']);
        await expectViewFrame(view, address);

        // Control: the second press's ListRecords lists "Elsewhere" (Rule 3).
        const second = await new OaiRepository(String(baseURL), other).listAll('ListRecords');
        expect(liveTitles(second)).toEqual(['Elsewhere']);
    });

    test('S2: The site-wide address answers for every journal', async ({asUser, ompApi, page, baseURL}, testInfo) => {
        test.slow();
        const sea = makeTag(2, testInfo);
        const hill = `${sea}h`;
        await seedPress(ompApi, sea, {context: {name: 'Sea Letters'}});
        await seedPublishedBook(ompApi, sea, 'Tidal Patterns');
        await seedPress(ompApi, hill, {context: {name: 'Hill Notes'}});
        await seedPublishedBook(ompApi, hill, 'Mountain Air');
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

        // Each press's record: its identifier from its own ListRecords,
        // then its Dublin Core record at the site-wide address (Rules 15, 16).
        const tidalId = identifierOfTitle(await seaOai.listAll('ListRecords'), 'Tidal Patterns');
        const mountainId = identifierOfTitle(await hillOai.listAll('ListRecords'), 'Mountain Air');
        expectLiveRecord(await site.getRecord(tidalId), tidalId, 'Tidal Patterns', 'site-wide GetRecord of Tidal Patterns');
        expectLiveRecord(await site.getRecord(mountainId), mountainId, 'Mountain Air', 'site-wide GetRecord of Mountain Air');

        // One press's set: each press's path lists its own book and not the
        // other's (Rules 8, 16).
        const seaSet = await site.listRecords({set: sea});
        expect(seaSet.error).toBeNull();
        expect(liveTitles(seaSet)).toContain('Tidal Patterns');
        expect(liveTitles(seaSet)).not.toContain('Mountain Air');
        const hillSet = await site.listRecords({set: hill});
        expect(hillSet.error).toBeNull();
        expect(liveTitles(hillSet)).toContain('Mountain Air');
        expect(liveTitles(hillSet)).not.toContain('Tidal Patterns');

        // Not across presses: "Sea Letters" does not hold "Mountain Air" (Rule 15).
        expectRefusal(await seaOai.getRecord(mountainId), 'idDoesNotExist', M.noIdentifier, 'Sea Letters, Mountain Air');

        // Control: "Hill Notes" does (Rule 15).
        expectLiveRecord(await hillOai.getRecord(mountainId), mountainId, 'Mountain Air', 'Hill Notes, Mountain Air');
    });

    test('S3: Records follow publishing', async ({asUser, ompApi, baseURL}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag(3, testInfo);
        await seedPress(ompApi, tag, {manager: true});
        const tidal = await seedPublishedBook(ompApi, tag, 'Tidal Patterns');
        await seedPublishedBook(ompApi, tag, 'Coral Reefs');
        const oai = new OaiRepository(String(baseURL), tag);
        const site = new OaiRepository(String(baseURL), SITE_PATH);
        const manager = await actorPage(asUser, `${tag}mg`);
        const today = utcDate();

        // Before: "Tidal Patterns", then "Coral Reefs" (Rule 6).
        const before = await oai.listAll('ListRecords');
        expect(liveTitles(before)).toEqual(['Tidal Patterns', 'Coral Reefs']);
        const tidalId = identifierOfTitle(before, 'Tidal Patterns');
        const coralId = identifierOfTitle(before, 'Coral Reefs');
        const tidalSets = /** @type {any} */ (recordOf(before, tidalId)).header.setSpecs;
        expect(tidalSets).toEqual([tag]);
        expectLiveRecord(await site.getRecord(coralId), coralId, 'Coral Reefs', 'Control, before');

        // Unpublished: the site-wide GetRecord shows the same identifier,
        // today's datestamp, the same set, deleted, no metadata (Rules 4, 4a).
        await openPublishedBook(manager, tag, tidal.submissionId);
        await unpublishFromWorkflow(manager);
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

        // The press's own address: "Coral Reefs" listed, "Tidal Patterns"
        // not live (Rule 4b).
        const after = await oai.listAll('ListRecords');
        expect(liveTitles(after)).toEqual(['Coral Reefs']);
        expect(after.records.filter((r) => r.header && r.header.identifier === tidalId && !r.header.deleted)).toEqual([]);

        // Published again: the record is back under the same identifier,
        // not deleted; the press lists both (Rule 4).
        await publishShown(manager);
        expectLiveRecord(await site.getRecord(tidalId), tidalId, 'Tidal Patterns', 'site-wide GetRecord, published again');
        const again = await oai.listAll('ListRecords');
        expect(liveTitles(again)).toEqual(['Tidal Patterns', 'Coral Reefs']);
        expect(identifierOfTitle(again, 'Tidal Patterns')).toBe(tidalId);

        // Control: "Coral Reefs" throughout (Rule 3).
        expectLiveRecord(await site.getRecord(coralId), coralId, 'Coral Reefs', 'Control, published again');
    });

    test('S4: Refused requests', async ({ompApi, page, baseURL}, testInfo) => {
        test.slow();
        const tag = makeTag(4, testInfo);
        await seedPress(ompApi, tag, {context: {name: 'Sea Letters'}});
        const tidal = await seedPublishedBook(ompApi, tag, 'Tidal Patterns');
        const oai = new OaiRepository(String(baseURL), tag);
        const view = new OaiView(page);
        const repo = await repositoryIdentifierOf(oai);
        const tidalId = oaiIdentifier(repo, KIND, tidal.publicationFormats[0].id);
        expectLiveRecord(await oai.getRecord(tidalId), tidalId, 'Tidal Patterns', 'the identifier as listed');
        const noSuchId = tidalId.replace(/\d+$/, '0');

        // Each refusal: "OAI Error(s)", the sentence, the code and the
        // message, in the XML and on the page (Rules 2, 10, 13, 15; the
        // table "Errors").
        const refusals = [
            [tag, '', 'badVerb', M.badVerb],
            [tag, 'verb=identify', 'badVerb', M.badVerb],
            [tag, 'verb=ListRecords', 'badArgument', M.missing('metadataPrefix')],
            [tag, 'verb=ListSets&metadataPrefix=oai_dc', 'badArgument', M.illegal('metadataPrefix')],
            [tag, 'verb=ListRecords&metadataPrefix=marcxml', 'cannotDisseminateFormat', M.noFormat],
            [tag, 'verb=GetRecord&metadataPrefix=oai_dc&identifier=foo', 'badArgument', M.badIdentifier],
            [tag, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(noSuchId)}`, 'idDoesNotExist', M.noIdentifier],
            [tag, 'verb=ListRecords&resumptionToken=abc', 'badResumptionToken', M.badToken],
            [tag, 'verb=ListRecords&resumptionToken=abc&metadataPrefix=oai_dc', 'badArgument', M.illegal('metadataPrefix')],
        ];
        for (const [path, query, code, message] of refusals) {
            const what = `?${query}`;
            expectRefusal(await new OaiRepository(String(baseURL), path).read(query), code, message, what);
            await view.open(path, query);
            await expect(view.errorHeading(), what).toBeVisible();
            await expect(view.errorIntro(), what).toBeVisible();
            expect(await view.value('Error Code'), what).toBe(code);
            await expect(view.errorMessage(), what).toHaveText(message);
            await expect(view.requestType(), `${what}: no answer`).toHaveCount(0);
        }

        // Control: Identify still answers (Rule 14).
        await view.open(tag, 'verb=Identify');
        await expect(view.requestType()).toHaveText('Request was of type Identify.');
        expect(await view.value('Repository Name')).toBe('Sea Letters');
        await expect(view.errorHeading()).toHaveCount(0);
    });

    test('S5: Asking by set and by date', async ({ompApi, baseURL}, testInfo) => {
        test.slow();
        const tag = makeTag(5, testInfo);
        await seedPress(ompApi, tag);
        await seedPublishedBook(ompApi, tag, 'Tidal Patterns');
        await seedPublishedBook(ompApi, tag, 'Hill Review');
        const oai = new OaiRepository(String(baseURL), tag);
        const today = utcDate();
        const tomorrow = utcDate(1);
        const yesterday = utcDate(-1);
        const both = ['Tidal Patterns', 'Hill Review'];
        const list = (args) => oai.listAll('ListRecords', args);
        const none = async (args, what) => expectRefusal(await oai.listRecords(args), 'noRecordsMatch', M.noRecords, what);

        // The press's set: both, in order, each datestamp today (Rules 4b, 5, 6, 8).
        const pressSet = await list({set: tag});
        expect(pressSet.error).toBeNull();
        expect(liveTitles(pressSet)).toEqual(both);
        expect(pressSet.headers.map((h) => h.datestamp.slice(0, 10))).toEqual([today, today]);

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

    test('S6: A journal closed to visitors, or taken off the site', async ({asUser, ompApi, page, baseURL}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const sea = makeTag(6, testInfo);
        const hill = `${sea}h`;
        await seedPress(ompApi, sea, {context: {name: 'Sea Letters', acronym: 'SL', country: 'CA'}});
        await seedPublishedBook(ompApi, sea, 'Tidal Patterns');
        await seedPress(ompApi, hill, {context: {name: 'Hill Notes'}, restrictSiteAccess: true});
        await seedPublishedBook(ompApi, hill, 'Mountain Air');
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

        // Before: the identifier from the press's list, and its record at
        // the site-wide address.
        const tidalId = identifierOfTitle(await seaOai.listAll('ListRecords'), 'Tidal Patterns');
        expectLiveRecord(await site.getRecord(tidalId), tidalId, 'Tidal Patterns', 'site-wide GetRecord, before');

        // Taken off the site: the Site Administrator unticks "Enable this
        // press to appear publicly on the site" and saves; the press's
        // address sends the visitor to Login, and the site-wide record is
        // deleted (Rules 16b, 18; Settings bullet 10).
        const admin = await actorPage(asUser, 'admin');
        const edit = new HostedContextEditWindow(admin, HOSTED);
        await edit.open(sea);
        expect(await edit.publicBoxLabel()).toBe('Enable this press to appear publicly on the site');
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
});
