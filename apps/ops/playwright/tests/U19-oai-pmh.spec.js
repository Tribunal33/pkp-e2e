// @ts-check
/**
 * @file playwright/tests/U19-oai-pmh.spec.js
 *
 * OAI-PMH — OPS suite, one test per canonical scenario a preprint server
 * runs: S1–S6 common to the three apps and S7 {OJS OPS} ("Enable OAI");
 * S8–S10 are {OJS}. The server's vocabulary throughout: a posted preprint
 * is the record, identified "oai:{repository identifier}:preprint/{ID}",
 * its page `preprint/view/{id}`; the first section is "Preprints" ("PRE");
 * Dublin Core is the only format; "Unpost" and "Post" are the workflow's
 * unpublish and publish; the Preprint Server Manager is the "Journal
 * Manager"; "Hosted Servers" and "…this preprint server to appear publicly
 * on the site" the Site Administrator's list and box; "Posting Mode" stands
 * before "Enable OAI". A preprint server keeps its own deleted records at
 * its own address (A1 is {OJS OMP}), so S3 and S7 read them there too.
 * Spec: docs/specs/U19-oai-pmh.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A2 🐞, A3 🐞, A20 🐞: S5 gives whole days only, all in the calendar.
 * - A4 🐞: no last part's "Resume" is read.
 * - A5 🐞: no ListMetadataFormats with an identifier is opened in the browser.
 * - A6 ❓, A14 ❓: no "Supporting Agencies", "Rights" or "Source" is read; no galley language.
 * - A16 🐞, A17 🐞: no argument is given twice; S4's malformed identifier
 *   lacks the `…:preprint/` start, the one shape the server refuses.
 * - A18 🐞: no datestamp is read after an edit or a second "Post".
 * - A19 🐞: no section is deleted.
 * - A21 ❓: nothing is read in French.
 * - OPS1 🐞: no list carries `until` (S5's `until` bullets are {OJS OMP}).
 * - OPS3 ❓: S1 reads the two eu-repo types, as the scenario says.
 * - OPS4 🐞: no server is removed.
 *
 * Seeding: scenario endpoints only, as footnote s says; publicknowledge and
 * the seeded roster are only read. Every scenario runs on its own scratch
 * preprint servers, each path the test's unique tag (plus a letter), one
 * language, with throwaway accounts (the username twice as password): an
 * Author "Ada Author" who submits every preprint, a Preprint Server Manager
 * in S3 and S7; S6's Site Administrator is `admin`. Preprints are posted by
 * the submission scenario (`published`, no `datePublished`), so every
 * datestamp and "Date" is today, UTC, each with the default abstract unless
 * the scenario names one. The first section's `abbrev` is a bare
 * string (a locale map stores "Array", scenarios.md). S6 passes
 * `restrictSiteAccess` and `context.country` (the Hosted Servers "Edit"
 * refuses to save a server with no Country, seed-facts); "Enable OAI" (S7),
 * the "Unpost" and second "Post" (S3, S7) and the Hosted Servers window
 * (S6) are the screens'.
 *
 * Reading: the visitor is the fixture `page` (no user: signed out). The OAI
 * answers are read raw through OaiPages' OaiRepository, a fresh request
 * context per read (no session, no language cookie, redirects followed),
 * and the browser view ("OAI 2.0 Request Results") is opened in the
 * visitor's page where a scenario reads the page itself (S1, the refusals
 * of S4, the Login pages of S6). A server's unfiltered list is walked
 * through every part ("Resume"). The site-wide address lists every context
 * on the install: its reads are GetRecord and `set`-filtered lists of the
 * scenario's own servers. Every absence is read on a settled answer (a
 * whole server response) beside a positive control taken the same way
 * (M4, M6). Everything here runs in the parallel `ops` project: every
 * setting changed is a scratch server's own.
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
    EnableOaiField,
    HostedContextEditWindow,
    siteContactEmail,
} = require('../../../../shared/playwright/pages/OaiPages.js');
const {AccessSettings} = require('../../../../shared/playwright/pages/SubscriptionsPages.js');
const {openWorkflow, postPreprint, unpostPreprint, statusReadout} = require('../pages/PublicationPages.js');

const M = O.messages;
const KIND = 'preprint';
const PDF = [{label: 'PDF', file: 'preprint.pdf'}];
const HOSTED = {hostedLabel: 'Hosted Servers'};
const OAI_FORMATS = ['oai_dc'];
const PREPRINT_TYPES = ['info:eu-repo/semantics/preprint', 'info:eu-repo/semantics/draft'];

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u19s${scenario}opw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: `${username}@mail.test`, roles};
}

/**
 * A scratch preprint server with the throwaway Author (`${tag}au`, Ada
 * Author) and, with `manager`, a Preprint Server Manager (`${tag}mg`), plus
 * context keys.
 */
async function seedServer(opsApi, tag, {manager = false, ...keys} = {}) {
    return opsApi.createContext({
        tag,
        users: [
            ...(manager ? [user(`${tag}mg`, 'Mona', 'Manager', ['manager'])] : []),
            user(`${tag}au`, 'Ada', 'Author', ['author']),
        ],
        ...keys,
    });
}

/** A preprint submitted by the server's Author; returns the createSubmission answer. */
async function seedPreprint(opsApi, tag, title, extra = {}) {
    return opsApi.createSubmission({
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

/**
 * Expect an answer to hold `identifier` as a deleted record: its header
 * marked deleted, no metadata; returns the header.
 */
function expectDeletedRecord(answer, identifier, what) {
    expect(answer.error, `${what}: no error`).toBeNull();
    const matches = answer.records.filter((r) => r.header && r.header.identifier === identifier);
    expect(matches, `${what}: one record of ${identifier}`).toHaveLength(1);
    expect(matches[0].header.deleted, `${what}: deleted`).toBe(true);
    expect(matches[0].metadata, `${what}: no metadata`).toBeNull();
    return matches[0].header;
}

/** The identifier of the live record titled `title` in a walked list (fails when there is none or several). */
function identifierOfTitle(list, title) {
    const matches = list.records.filter((r) => r.header && !r.header.deleted && r.dc && r.dc.title[0] === title);
    expect(matches.map((r) => r.header.identifier), `one live record titled ${title}`).toHaveLength(1);
    return matches[0].header.identifier;
}

/** The repository identifier the server's Identify names. */
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

/** "Unpost" a posted preprint on its workflow (U49 scenario 3's way, the server's words). */
async function unpostOnScreen(page, tag, submissionId) {
    await openWorkflow(page, tag, submissionId);
    await expect(statusReadout(page)).toContainText('Posted', {timeout: 30_000});
    await unpostPreprint(page);
    await expect(statusReadout(page)).toContainText('Unposted', {timeout: 30_000});
}

test.describe('OAI-PMH', () => {
    test('S1: A harvester reads a journal\'s address', async ({opsApi, page, baseURL}, testInfo) => {
        test.slow();
        const tag = makeTag(1, testInfo);
        const other = `${tag}b`;
        await seedServer(opsApi, tag, {
            context: {name: 'Sea Letters', contactName: 'Pat Contact', contactEmail: 'pat.contact@example.org'},
            sections: [{abbrev: 'PRE', title: 'Preprints'}],
        });
        const tidal = await seedPreprint(opsApi, tag, 'Tidal Patterns', {
            abstract: 'Tides follow the moon.',
            keywords: ['tides', 'moon'],
            published: true,
            galleys: PDF,
        });
        const draft = await seedPreprint(opsApi, tag, 'Draft Study');
        await seedServer(opsApi, other);
        const elsewhere = await seedPreprint(opsApi, other, 'Elsewhere', {published: true});
        const oai = new OaiRepository(String(baseURL), tag);
        const address = oai.address();
        const view = new OaiView(page);
        const today = utcDate();
        const preprintPage = `${baseURL}/index.php/${tag}/preprint/view/${tidal.submissionId}`;
        const galleyAddress = `${preprintPage}/${tidal.galleys[0].id}`;

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
        await expect(page.locator('body')).toContainText('Open Preprint Systems');
        await expectViewFrame(view, address);
        const tidalId = oaiIdentifier(repo, KIND, tidal.submissionId);

        // ListSets: the server, then its section "Preprints" (Rule 7).
        await view.pressQuickLink('ListSets');
        await expect(view.requestType()).toHaveText('Request was of type ListSets.');
        await expect(view.setBlocks()).toHaveCount(2);
        expect(await view.setSpecs(view.setBlock('Sea Letters'))).toEqual([tag]);
        expect(await view.setSpecs(view.setBlock('Preprints'))).toEqual([`${tag}:PRE`]);
        await expectViewFrame(view, address);

        // ListMetadataFormats: one format, "oai_dc" (Rule 10; the table "The formats").
        await view.pressQuickLink('ListMetadataFormats');
        await expect(view.requestType()).toHaveText('Request was of type ListMetadataFormats.');
        await expect(page.getByText(O.formatsIntro, {exact: true})).toBeVisible();
        await expect(view.formatBlocks()).toHaveCount(1);
        expect(await view.valueList('metadataPrefix')).toEqual(OAI_FORMATS);
        expect(prefixes(await oai.listMetadataFormats())).toEqual(OAI_FORMATS);
        await expectViewFrame(view, address);

        // ListRecords: the record of "Tidal Patterns", its identifier and its
        // section's setSpec (Rules 3, 3b, 7d; the table "A record's header").
        await view.pressQuickLink('ListRecords');
        await expect(view.requestType()).toHaveText('Request was of type ListRecords.');
        await expectViewFrame(view, address);
        const block = await view.findRecord(tidalId);
        expect(await view.identifierIn(block)).toBe(tidalId);
        expect(await view.setSpecs(block)).toEqual([`${tag}:PRE`]);
        const list = await oai.listAll('ListRecords');
        const listed = recordOf(list, tidalId);
        expect(listed && listed.header.setSpecs).toEqual([`${tag}:PRE`]);
        expect(listed && listed.dc && listed.dc.title).toEqual(['Tidal Patterns']);

        // Not listed: "Draft Study" and "Elsewhere", beside "Tidal Patterns" (Rule 3).
        const titles = list.records.filter((r) => r.dc).flatMap((r) => r.dc.title);
        expect(titles).toEqual(['Tidal Patterns']);
        for (const absent of ['Draft Study', 'Elsewhere']) {
            expect(titles, `${absent} listed`).not.toContain(absent);
        }
        const identifiers = list.headers.map((h) => h.identifier);
        expect(identifiers).toEqual([tidalId]);
        for (const [name, item] of [['Draft Study', draft], ['Elsewhere', elsewhere]]) {
            expect(identifiers, `${name}'s identifier listed`).not.toContain(oaiIdentifier(repo, KIND, item.submissionId));
        }

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
        expect(sorted(await view.valueList('Resource Type', shown))).toEqual(sorted(PREPRINT_TYPES));
        expect(await view.valueList('Format', shown)).toEqual(['application/pdf']);
        expect(await view.valueList('Resource Identifier', shown)).toEqual([preprintPage]);
        expect(await view.valueList('Language', shown)).toEqual(['en']);
        await expect(view.values('Relation', shown).getByRole('link')).toHaveAttribute('href', galleyAddress);
        await expectViewFrame(view, address);
        const record = await oai.getRecord(tidalId);
        expectLiveRecord(record, tidalId, 'Tidal Patterns', 'GetRecord');
        const dc = /** @type {any} */ (recordOf(record, tidalId)).dc;
        expect(dc.relation).toEqual([galleyAddress]);
        expect(dc.identifier).toEqual([preprintPage]);

        // The browser view: back on ListSets, "Records" of "Preprints" lists
        // "Tidal Patterns" (Fields, "The browser view").
        await view.pressQuickLink('ListSets');
        await view.setBlock('Preprints').getByRole('link', {name: 'Records', exact: true}).click();
        await view.expectLoaded();
        await expect(view.requestType()).toHaveText('Request was of type ListRecords.');
        await expect(view.recordHeading(tidalId)).toHaveCount(1);
        expect(await view.recordIdentifiers()).toEqual([tidalId]);
        await expectViewFrame(view, address);

        // Control: the second server's ListRecords lists "Elsewhere" (Rule 3).
        const second = await new OaiRepository(String(baseURL), other).listAll('ListRecords');
        expect(liveTitles(second)).toEqual(['Elsewhere']);
    });

    test('S2: The site-wide address answers for every journal', async ({asUser, opsApi, page, baseURL}, testInfo) => {
        test.slow();
        const sea = makeTag(2, testInfo);
        const hill = `${sea}h`;
        await seedServer(opsApi, sea, {context: {name: 'Sea Letters'}});
        await seedPreprint(opsApi, sea, 'Tidal Patterns', {published: true});
        await seedServer(opsApi, hill, {context: {name: 'Hill Notes'}});
        await seedPreprint(opsApi, hill, 'Mountain Air', {published: true});
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

        // Each server's record: its identifier from its own ListRecords,
        // then its Dublin Core record at the site-wide address (Rules 15, 16).
        const tidalId = identifierOfTitle(await seaOai.listAll('ListRecords'), 'Tidal Patterns');
        const mountainId = identifierOfTitle(await hillOai.listAll('ListRecords'), 'Mountain Air');
        expectLiveRecord(await site.getRecord(tidalId), tidalId, 'Tidal Patterns', 'site-wide GetRecord of Tidal Patterns');
        expectLiveRecord(await site.getRecord(mountainId), mountainId, 'Mountain Air', 'site-wide GetRecord of Mountain Air');

        // One server's set: each server's path lists its own preprint and
        // not the other's (Rules 8, 16).
        const seaSet = await site.listRecords({set: sea});
        expect(seaSet.error).toBeNull();
        expect(liveTitles(seaSet)).toEqual(['Tidal Patterns']);
        expect(liveTitles(seaSet)).not.toContain('Mountain Air');
        const hillSet = await site.listRecords({set: hill});
        expect(hillSet.error).toBeNull();
        expect(liveTitles(hillSet)).toEqual(['Mountain Air']);
        expect(liveTitles(hillSet)).not.toContain('Tidal Patterns');

        // Not across servers: "Sea Letters" does not hold "Mountain Air" (Rule 15).
        expectRefusal(await seaOai.getRecord(mountainId), 'idDoesNotExist', M.noIdentifier, 'Sea Letters, Mountain Air');

        // Control: "Hill Notes" does (Rule 15).
        expectLiveRecord(await hillOai.getRecord(mountainId), mountainId, 'Mountain Air', 'Hill Notes, Mountain Air');
    });

    test('S3: Records follow publishing', async ({asUser, opsApi, baseURL}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag(3, testInfo);
        await seedServer(opsApi, tag, {manager: true});
        const tidal = await seedPreprint(opsApi, tag, 'Tidal Patterns', {published: true});
        await seedPreprint(opsApi, tag, 'Coral Reefs', {published: true});
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
        expectLiveRecord(await site.getRecord(coralId), coralId, 'Coral Reefs', 'Control, before');

        // Unpublished ("Unpost"): the site-wide GetRecord shows the same
        // identifier, today's datestamp, the same set, deleted, no metadata
        // (Rule 4).
        await unpostOnScreen(manager, tag, tidal.submissionId);
        const gone = expectDeletedRecord(await site.getRecord(tidalId), tidalId, 'site-wide GetRecord, unposted');
        expect(gone.datestamp).toMatch(new RegExp(`^${today}T`));
        expect(gone.setSpecs).toEqual(tidalSets);
        expectLiveRecord(await site.getRecord(coralId), coralId, 'Coral Reefs', 'Control, unposted');

        // The server's own address: "Coral Reefs" listed, "Tidal Patterns"
        // not live, its deleted record listed under the same identifier
        // (Rule 4b: a preprint server keeps its own deleted records).
        const after = await oai.listAll('ListRecords');
        expect(liveTitles(after)).toEqual(['Coral Reefs']);
        const listedGone = expectDeletedRecord(after, tidalId, 'the server\'s ListRecords, unposted');
        expect(listedGone.setSpecs).toEqual(tidalSets);
        expect(after.records.filter((r) => r.header && r.header.identifier === tidalId && !r.header.deleted)).toEqual([]);

        // Published again ("Post"): the record is back under the same
        // identifier, not deleted; the server lists both (Rule 4).
        await postPreprint(manager);
        expectLiveRecord(await site.getRecord(tidalId), tidalId, 'Tidal Patterns', 'site-wide GetRecord, posted again');
        const again = await oai.listAll('ListRecords');
        expect(liveTitles(again)).toEqual(['Tidal Patterns', 'Coral Reefs']);
        expect(identifierOfTitle(again, 'Tidal Patterns')).toBe(tidalId);
        expect(again.records.filter((r) => r.header && r.header.deleted)).toEqual([]);

        // Control: "Coral Reefs" throughout (Rule 3).
        expectLiveRecord(await site.getRecord(coralId), coralId, 'Coral Reefs', 'Control, posted again');
    });

    test('S4: Refused requests', async ({opsApi, page, baseURL}, testInfo) => {
        test.slow();
        const tag = makeTag(4, testInfo);
        const empty = `${tag}e`;
        await seedServer(opsApi, tag, {context: {name: 'Sea Letters'}});
        const tidal = await seedPreprint(opsApi, tag, 'Tidal Patterns', {published: true});
        await seedServer(opsApi, empty, {context: {name: 'Empty Shelf'}});
        const oai = new OaiRepository(String(baseURL), tag);
        const emptyOai = new OaiRepository(String(baseURL), empty);
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
            ['verb=ListRecords&metadataPrefix=marcxml', 'cannotDisseminateFormat', M.noFormat],
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

        // Nothing to list: "Empty Shelf" answers "noRecordsMatch", and its
        // "Earliest Datestamp" is the moment of the request (Rule 3; Fields,
        // "Identify"); its Identify answers, so only the list was empty.
        expectRefusal(await emptyOai.listRecords(), 'noRecordsMatch', M.noRecords, 'Empty Shelf ListRecords');
        const asked = Date.now();
        const emptyIdentify = await emptyOai.identify();
        const answered = Date.now();
        expect(emptyIdentify.error).toBeNull();
        expect(emptyIdentify.identify && emptyIdentify.identify.repositoryName).toBe('Empty Shelf');
        const earliest = Date.parse(String(emptyIdentify.identify && emptyIdentify.identify.earliestDatestamp));
        expect(earliest, 'Earliest Datestamp, not before the request').toBeGreaterThanOrEqual(Math.floor(asked / 1000) * 1000 - 1000);
        expect(earliest, 'Earliest Datestamp, not after the answer').toBeLessThanOrEqual(answered + 1000);
        expect(Math.abs(earliest - Date.parse(String(emptyIdentify.responseDate))), 'Earliest Datestamp, the response\'s moment')
            .toBeLessThanOrEqual(1000);

        // Control: Identify still answers (Rule 14).
        await view.open(tag, 'verb=Identify');
        await expect(view.requestType()).toHaveText('Request was of type Identify.');
        expect(await view.value('Repository Name')).toBe('Sea Letters');
        await expect(view.errorHeading()).toHaveCount(0);
    });

    test('S5: Asking by set and by date', async ({opsApi, baseURL}, testInfo) => {
        test.slow();
        const tag = makeTag(5, testInfo);
        await seedServer(opsApi, tag, {
            sections: [{abbrev: 'ART', title: 'Articles'}, {abbrev: 'REV', title: 'Reviews'}],
        });
        await seedPreprint(opsApi, tag, 'Tidal Patterns', {section: 'ART', published: true});
        await seedPreprint(opsApi, tag, 'Hill Review', {section: 'REV', published: true});
        const oai = new OaiRepository(String(baseURL), tag);
        const today = utcDate();
        const tomorrow = utcDate(1);
        const both = ['Tidal Patterns', 'Hill Review'];
        const list = (args) => oai.listAll('ListRecords', args);
        const none = async (args, what) => expectRefusal(await oai.listRecords(args), 'noRecordsMatch', M.noRecords, what);

        // The server's set: both, in order, each datestamp today (Rules 4b, 5, 6, 8).
        const serverSet = await list({set: tag});
        expect(serverSet.error).toBeNull();
        expect(liveTitles(serverSet)).toEqual(both);
        expect(serverSet.headers.map((h) => h.datestamp.slice(0, 10))).toEqual([today, today]);

        // A section's set (Rule 8).
        expect(liveTitles(await list({set: `${tag}:ART`}))).toEqual(['Tidal Patterns']);
        expect(liveTitles(await list({set: `${tag}:REV`}))).toEqual(['Hill Review']);

        // A set the server does not have (Rules 4b, 8).
        await none({set: 'nosuchset'}, 'set=nosuchset');

        // `from` (Rules 4b, 9). `until` is not read on a preprint server (OPS1).
        expect(liveTitles(await list({set: tag, from: today}))).toEqual(both);
        await none({set: tag, from: tomorrow}, 'from tomorrow');

        // Dates written wrong (Rule 9; the table "Errors").
        const [y, m, d] = today.split('-');
        expectRefusal(await oai.listRecords({set: tag, from: `${d}-${m}-${y}`}), 'badArgument', M.illegalFrom, 'from DD-MM-YYYY');

        // Control: a date written right lists both (Rule 9).
        expect(liveTitles(await list({set: tag, from: '2000-01-01'}))).toEqual(both);
    });

    test('S6: A journal closed to visitors, or taken off the site', async ({asUser, opsApi, page, baseURL}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const sea = makeTag(6, testInfo);
        const hill = `${sea}h`;
        await seedServer(opsApi, sea, {context: {name: 'Sea Letters', acronym: 'SL', country: 'CA'}});
        await seedPreprint(opsApi, sea, 'Tidal Patterns', {published: true});
        await seedServer(opsApi, hill, {context: {name: 'Hill Notes'}, restrictSiteAccess: true});
        await seedPreprint(opsApi, hill, 'Mountain Air', {published: true});
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

        // Before: the identifier from the server's list, and its record at
        // the site-wide address.
        const tidalId = identifierOfTitle(await seaOai.listAll('ListRecords'), 'Tidal Patterns');
        expectLiveRecord(await site.getRecord(tidalId), tidalId, 'Tidal Patterns', 'site-wide GetRecord, before');

        // Taken off the site: the Site Administrator unticks "Enable this
        // preprint server to appear publicly on the site" and saves; the
        // server's address sends the visitor to Login, and the site-wide
        // record is deleted (Rules 16b, 18; Settings bullet 10).
        const admin = await actorPage(asUser, 'admin');
        const edit = new HostedContextEditWindow(admin, HOSTED);
        await edit.open(sea);
        expect(await edit.publicBoxLabel()).toBe('Enable this preprint server to appear publicly on the site');
        await expect(edit.publicBox).toBeChecked();
        await expect(edit.countrySelect).toHaveValue('CA');
        await edit.publicBox.uncheck();
        expect((await edit.save()).status(), 'the Edit window saves').toBe(200);
        await expect(edit.publicBox).toHaveCount(0);
        await page.goto(`/index.php/${sea}/oai?verb=Identify`);
        await expect(page).toHaveURL(loginOf(sea));
        await expect(loginForm).toBeVisible();
        expectDeletedRecord(await site.getRecord(tidalId), tidalId, 'site-wide GetRecord, off the site');

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

    test('S7: "Enable OAI" withholds a journal\'s records', async ({asUser, opsApi, baseURL}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag(7, testInfo);
        await seedServer(opsApi, tag, {manager: true, context: {name: 'Sea Letters'}});
        await seedPreprint(opsApi, tag, 'Tidal Patterns', {published: true});
        const coral = await seedPreprint(opsApi, tag, 'Coral Reefs', {published: true});
        const oai = new OaiRepository(String(baseURL), tag);
        const site = new OaiRepository(String(baseURL), SITE_PATH);
        const manager = await actorPage(asUser, `${tag}mg`);
        const field = new EnableOaiField(manager, tag, new AccessSettings(manager, tag));

        // The field: after "Posting Mode", with its help line, "Enable"
        // chosen (Fields, "Enable OAI").
        await field.goto();
        const groups = await field.groupNames();
        expect(groups.indexOf(O.enableOai)).toBe(groups.indexOf('Posting Mode') + 1);
        expect(groups.indexOf('Posting Mode')).toBeGreaterThanOrEqual(0);
        expect(await field.groupLines()).toEqual([O.enableOai, O.enableOaiHelp, 'Enable', 'Disable']);
        await expect(field.radio('Enable')).toBeChecked();
        await expect(field.radio('Disable')).not.toBeChecked();

        // A deleted record first: the identifiers, then "Coral Reefs" unposted.
        const list = await oai.listAll('ListRecords');
        const tidalId = identifierOfTitle(list, 'Tidal Patterns');
        const coralId = identifierOfTitle(list, 'Coral Reefs');
        await unpostOnScreen(manager, tag, coral.submissionId);

        // Control, before "Disable": the server's GetRecord of "Tidal Patterns" (Rule 17).
        expectLiveRecord(await oai.getRecord(tidalId), tidalId, 'Tidal Patterns', 'server GetRecord, before');

        // "Disable": the record leaves both addresses; Identify and ListSets
        // answer as before (Rule 17; Settings bullet 1).
        await field.goto();
        expect((await field.choose('Disable')).status()).toBe(200);
        expectRefusal(await oai.getRecord(tidalId), 'idDoesNotExist', M.noIdentifier, 'server GetRecord, disabled');
        expectRefusal(await site.getRecord(tidalId), 'idDoesNotExist', M.noIdentifier, 'site-wide GetRecord, disabled');
        expectRefusal(await oai.listMetadataFormats(tidalId), 'idDoesNotExist', M.noIdentifier, 'ListMetadataFormats, disabled');
        const identify = await oai.identify();
        expect(identify.identify && identify.identify.repositoryName).toBe('Sea Letters');
        expect((await oai.listSets()).sets).toContainEqual({spec: tag, name: 'Sea Letters'});

        // Deleted records stay: the site-wide GetRecord of "Coral Reefs"; the
        // server's own ListRecords lists that deleted record and no live
        // one, and its "Earliest Datestamp" is that record's (Rule 17a).
        expectDeletedRecord(await site.getRecord(coralId), coralId, 'site-wide GetRecord of Coral Reefs, disabled');
        const disabledList = await oai.listAll('ListRecords');
        const coralHeader = expectDeletedRecord(disabledList, coralId, 'the server\'s ListRecords, disabled');
        expect(liveTitles(disabledList)).toEqual([]);
        expect(disabledList.headers.map((h) => h.identifier)).toEqual([coralId]);
        expect(identify.identify && identify.identify.earliestDatestamp).toBe(coralHeader.datestamp);

        // "Enable" again: the record is back under the same identifier (Rule 17).
        await field.goto();
        await expect(field.radio('Disable')).toBeChecked();
        expect((await field.choose('Enable')).status()).toBe(200);
        expectLiveRecord(await oai.getRecord(tidalId), tidalId, 'Tidal Patterns', 'server GetRecord, enabled again');
    });
});
