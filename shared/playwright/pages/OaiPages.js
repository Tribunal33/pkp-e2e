// @ts-check
/**
 * @file shared/playwright/pages/OaiPages.js
 *
 * Page objects for U19 "OAI-PMH" (docs/specs/U19-oai-pmh.md), shared by the
 * OJS, OMP and OPS suites. App-neutral: the OAI answers are lib/pkp's
 * (`OAI`, `oai2.xsl`), the plugin grid and the settings forms lib/pkp's;
 * every word that differs per app (the record kind in an identifier, the
 * "Hosted …" label) is passed in by the suite or read from the answer.
 *
 * Surfaces:
 * - oaiPath / readOai / OaiRepository — the OAI address of a context (or of
 *   the site, SITE_PATH) read the way a harvester reads it: a plain GET in
 *   a fresh request context with no session and no cookie (the app keeps
 *   the language of the last request in a cookie, U19 ccK3), redirects
 *   followed (a context with more than one language answers `{ctx}/oai`
 *   with a 302 to `{ctx}/en/oai`). Each answer comes back parsed:
 *   parseOai (the request line, the error, Identify, sets, formats, the
 *   records with their headers and metadata, the resumptionToken),
 *   parseDc (a Dublin Core record by element) and parseMarc (a MARC record,
 *   `marcxml` or `oai_marc`, by field number). OaiRepository.listAll walks
 *   a list's parts ("Resume") so a record behind other contexts' deleted
 *   records (register A1) is still found.
 * - OaiView — the browser view of an answer (the XSLT page "OAI 2.0
 *   Request Results"): its heading, the two rows of request links, the
 *   key/value rows, the error block, the "Set" and "Metadata Format"
 *   blocks, a record's block by its identifier and the links in it, the
 *   "Resume" walk.
 * - EnableOaiField — Settings › Distribution › "Access": the "Enable OAI"
 *   group (its help text, "Enable" / "Disable"), saved through the
 *   SubscriptionsPages AccessSettings "Save".
 * - PluginGrid / JatsFormatWindow — Settings › Website › "Plugins" ›
 *   "Installed Plugins": a plugin's row by its name (the row ids are
 *   mixed-case, ccK1), its "Enabled" box (the disable question answered),
 *   the arrow and "Settings"; the "JATS Metadata Format" window.
 * - HostedContextEditWindow — Administration › Hosted Journals (Presses,
 *   Servers) › a row's "Edit": "Enable this … to appear publicly on the
 *   site", "Country", "Save" (the list itself is UsersManagementPages'
 *   HostedContextsPage).
 * - siteContactEmail — Administration › Site Settings › "Information",
 *   "Email of principal contact".
 *
 * DOM shapes from the U19 claim check (.reports/U19/screen-notes.md, the kept
 * scripts under shared/playwright/checks/U19/) and the OJS test author's
 * probes, 2026-09-26.
 */
const {expect, request: playwrightRequest} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {waitForJQueryIdle} = require('../support/legacy.js');
const {HostedContextsPage} = require('./UsersManagementPages.js');

const T = 30_000;

/** The path segment of the site-wide address (`{site}/index.php/index/oai`). */
const SITE_PATH = 'index';

/** The words of the browser view (lib/pkp/xml/oai2.xsl) and the app's messages, English. */
const OAI_TEXT = {
    pageTitle: 'OAI 2.0 Request Results',
    quickLinks: ['Identify', 'ListRecords', 'ListSets', 'ListMetadataFormats', 'ListIdentifiers'],
    intro:
        'You are viewing an HTML version of the XML OAI response. To see the underlying XML use your web browsers ' +
        'view source option. More information about this XSLT is at the bottom of the page.',
    aboutXslt: 'About the XSLT',
    errorsHeading: 'OAI Error(s)',
    errorsIntro: 'The request could not be completed due to the following error or errors.',
    deleted: 'This record has been deleted.',
    dcHeading: 'Dublin Core Metadata (oai_dc)',
    unknownFormat: 'Unknown Metadata Format',
    moreResults: 'There are more results.',
    formatsIntro: 'This is a list of metadata formats available from this archive.',
    enableOai: 'Enable OAI',
    enableOaiHelp: 'Provide metadata to third-party indexing services through the Open Archives Initiative.',
    jatsWindowDescription:
        'This plugin provides metadata to external services in the JATS XML format via the OAI-PMH interface. ' +
        'When used in conjunction with the JATS Template plugin, it can function even if JATS XML documents have ' +
        'not been uploaded into OJS.',
    ignoreUploaded: 'Ignore uploaded JATS XML documents',
    saved: 'Your changes have been saved.',
    settingsSaved: 'Saved',
    disableQuestion: 'Are you sure you want to disable this plugin?',
    messages: {
        badVerb: 'Illegal OAI verb',
        missing: (argument) => `Missing ${argument} parameter`,
        illegal: (argument) => `${argument} is an illegal parameter`,
        badIdentifier: 'Identifier is not in a valid format',
        noIdentifier: 'No matching identifier in this repository',
        noFormat: 'The requested metadataPrefix is not supported by this repository',
        jatsRefused: 'Cannot disseminate format (unauthenticated access to JATS XML not allowed)',
        jatsUnavailable: 'Cannot disseminate format (JATS XML not available)',
        noRecords: 'No matching records in this repository',
        badToken: 'The requested resumptionToken is invalid or has expired',
        illegalFrom: 'Illegal from parameter',
        illegalUntil: 'Illegal until parameter',
        untilBeforeFrom: 'until parameter must be greater than or equal to from parameter',
        granularity: 'until and from parameters must be of the same granularity',
    },
};

// ---------------------------------------------------------------------------
// The answer as data
// ---------------------------------------------------------------------------

/** Decode the XML entities an answer uses. */
function decode(text) {
    return String(text)
        .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(parseInt(d, 10)))
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&');
}

/** The text of each `<tag …>…</tag>` in `xml`, decoded and trimmed. */
function texts(xml, tag) {
    const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g');
    return [...String(xml).matchAll(re)].map((m) => decode(m[1].trim()));
}

/** An element's attributes as a map (`name="value"`). */
function attributes(text) {
    return Object.fromEntries([...String(text).matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], decode(m[2])]));
}

/** A header (`<header status="deleted">…</header>`) as data. */
function parseHeader(match) {
    const attrs = attributes(match[1] || '');
    return {
        deleted: attrs.status === 'deleted',
        identifier: texts(match[2], 'identifier')[0] || null,
        datestamp: texts(match[2], 'datestamp')[0] || null,
        setSpecs: texts(match[2], 'setSpec'),
    };
}

/**
 * A Dublin Core record (`oai_dc:dc`) by element: `{title: [...], creator:
 * [...], subject, description, publisher, contributor, date, type, format,
 * identifier, source, language, relation, coverage, rights}`, each the list
 * of its values in document order (absent elements are empty lists).
 *
 * @param {string} xml
 */
function parseDc(xml) {
    const out = {};
    for (const name of ['title', 'creator', 'subject', 'description', 'publisher', 'contributor', 'date', 'type',
        'format', 'identifier', 'source', 'language', 'relation', 'coverage', 'rights']) {
        out[name] = texts(xml, `dc:${name}`);
    }
    return out;
}

/**
 * A MARC record (`marcxml` or `oai_marc`) as its fields in document order:
 * `[{tag, subfields: [{code, value}]}]`, a control field's value as one
 * subfield with code ''. The markup's own spellings (`datafield`,
 * `dataField`, `varfield`, `tag`/`id`, `code`/`label`) are read alike: the
 * suites read the values, never the markup (register A12).
 *
 * @param {string} xml
 */
function parseMarc(xml) {
    const fields = [];
    const re = /<(datafield|dataField|varfield|controlfield|fixfield)\s([^>]*)>([\s\S]*?)<\/\1>/g;
    for (const m of String(xml).matchAll(re)) {
        const attrs = attributes(m[2]);
        const tag = attrs.tag || attrs.id || '';
        const subs = [...m[3].matchAll(/<subfield\s([^>]*)>([\s\S]*?)<\/subfield>/g)].map((s) => {
            const a = attributes(s[1]);
            return {code: a.code || a.label || '', value: decode(s[2].trim())};
        });
        fields.push({tag, subfields: /control|fix/.test(m[1]) ? [{code: '', value: decode(m[3].trim())}] : subs});
    }
    return fields;
}

/** Every subfield value of a MARC field number, field by field: `[[a, b], [c]]`. */
function marcValues(fields, tag) {
    return fields.filter((f) => f.tag === tag).map((f) => f.subfields.map((s) => s.value));
}

/**
 * An OAI answer taken apart. Records are cut at their `<record>` openers
 * (a MARC record inside the metadata carries its own `<record …>`).
 *
 * @param {string} body
 */
function parseOai(body) {
    const x = String(body || '');
    const req = x.match(/<request([^>]*)>([^<]*)<\/request>/);
    const errors = [...x.matchAll(/<error code="([^"]*)">([\s\S]*?)<\/error>/g)].map((m) => ({code: m[1], message: decode(m[2].trim())}));
    const identify = /<Identify>/.test(x)
        ? {
            repositoryName: texts(x, 'repositoryName')[0] ?? null,
            baseURL: texts(x, 'baseURL')[0] ?? null,
            protocolVersion: texts(x, 'protocolVersion')[0] ?? null,
            adminEmail: texts(x, 'adminEmail')[0] ?? null,
            earliestDatestamp: texts(x, 'earliestDatestamp')[0] ?? null,
            deletedRecord: texts(x, 'deletedRecord')[0] ?? null,
            granularity: texts(x, 'granularity')[0] ?? null,
            scheme: texts(x, 'scheme')[0] ?? null,
            repositoryIdentifier: texts(x, 'repositoryIdentifier')[0] ?? null,
            delimiter: texts(x, 'delimiter')[0] ?? null,
            sampleIdentifier: texts(x, 'sampleIdentifier')[0] ?? null,
            software: texts(x, 'title')[0] ?? null,
        }
        : null;
    const sets = [...x.matchAll(/<set>([\s\S]*?)<\/set>/g)].map((m) => ({spec: texts(m[1], 'setSpec')[0], name: texts(m[1], 'setName')[0]}));
    const formats = [...x.matchAll(/<metadataFormat>([\s\S]*?)<\/metadataFormat>/g)].map((m) => ({
        prefix: texts(m[1], 'metadataPrefix')[0],
        schema: texts(m[1], 'schema')[0],
        namespace: texts(m[1], 'metadataNamespace')[0],
    }));
    const headers = [...x.matchAll(/<header((?:\s[^>]*)?)>([\s\S]*?)<\/header>/g)].map(parseHeader);
    const records = x
        .split(/<record>/)
        .slice(1)
        .map((chunk) => {
            const h = chunk.match(/<header((?:\s[^>]*)?)>([\s\S]*?)<\/header>/);
            const start = chunk.indexOf('<metadata>');
            const end = chunk.lastIndexOf('</metadata>');
            const metadata = start >= 0 && end > start ? chunk.slice(start + '<metadata>'.length, end).trim() : null;
            return {
                header: h ? parseHeader(h) : null,
                metadata,
                dc: metadata && /<oai_dc:dc[\s>]/.test(metadata) ? parseDc(metadata) : null,
            };
        });
    const token = x.match(/<resumptionToken([^>]*)>([^<]*)<\/resumptionToken>/);
    return {
        responseDate: texts(x, 'responseDate')[0] || null,
        request: req ? {attributes: attributes(req[1]), url: decode(req[2].trim())} : null,
        error: errors[0] || null,
        errors,
        identify,
        sets,
        formats,
        headers,
        records,
        token: token ? {...attributes(token[1]), value: token[2].trim()} : null,
    };
}

// ---------------------------------------------------------------------------
// Reading an address
// ---------------------------------------------------------------------------

/**
 * The OAI address of a context (SITE_PATH for the site-wide one) with a
 * request: `params` an object (keys in order, values URL-encoded) or a
 * query string as typed (`verb=identify`); '' for the bare address.
 *
 * @param {string} contextPath
 * @param {Record<string, string>|string} [params]
 */
function oaiPath(contextPath, params = '') {
    const query = typeof params === 'string'
        ? params
        : Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    return `/index.php/${contextPath}/oai${query ? `?${query}` : ''}`;
}

/**
 * Read an OAI address as a harvester does: a fresh request context (no
 * session, no language cookie), redirects followed. Returns the status,
 * the address that answered, the content type, the raw body and the
 * answer parsed (parseOai).
 *
 * @param {string} baseURL
 * @param {string} contextPath
 * @param {Record<string, string>|string} [params]
 */
async function readOai(baseURL, contextPath, params = '') {
    const context = await playwrightRequest.newContext({baseURL});
    try {
        const response = await context.get(oaiPath(contextPath, params), {failOnStatusCode: false, timeout: T});
        const body = await response.text();
        const contentType = response.headers()['content-type'] || '';
        return {
            status: response.status(),
            url: response.url(),
            contentType,
            body,
            ...parseOai(/xml/.test(contentType) ? body : ''),
        };
    } finally {
        await context.dispose();
    }
}

/**
 * `oai:{repository identifier}:{kind}/{id}` (kind `article`,
 * `publicationFormat` or `preprint`).
 */
function oaiIdentifier(repositoryIdentifier, kind, id) {
    return `oai:${repositoryIdentifier}:${kind}/${id}`;
}

/** A UTC date `YYYY-MM-DD`, `offsetDays` from today (the suites run with TZ=UTC). */
function utcDate(offsetDays = 0) {
    return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

/** One OAI address (a context's, or the site's with SITE_PATH), read as a harvester. */
class OaiRepository {
    /**
     * @param {string} baseURL
     * @param {string} contextPath
     */
    constructor(baseURL, contextPath) {
        this.baseURL = baseURL;
        this.contextPath = contextPath;
    }

    /** The address with a request, as a full URL. */
    url(params = '') {
        return `${this.baseURL}${oaiPath(this.contextPath, params)}`;
    }

    /** The address with no request, as "Base URL" and "Request URL" read it on a one-language context. */
    address() {
        return this.url();
    }

    /** Any request (an object of arguments or a query string as typed). */
    read(params = '') {
        return readOai(this.baseURL, this.contextPath, params);
    }

    identify() {
        return this.read({verb: 'Identify'});
    }

    listSets() {
        return this.read({verb: 'ListSets'});
    }

    /** ListMetadataFormats, with `identifier` when given. */
    listMetadataFormats(identifier = null) {
        return this.read(identifier ? {verb: 'ListMetadataFormats', identifier} : {verb: 'ListMetadataFormats'});
    }

    /** ListRecords, `metadataPrefix` oai_dc unless `args` name another; `args` adds set, from, until. */
    listRecords(args = {}) {
        return this.read({verb: 'ListRecords', metadataPrefix: 'oai_dc', ...args});
    }

    /** ListIdentifiers, as listRecords. */
    listIdentifiers(args = {}) {
        return this.read({verb: 'ListIdentifiers', metadataPrefix: 'oai_dc', ...args});
    }

    /** GetRecord of an identifier in a format (oai_dc by default). */
    getRecord(identifier, metadataPrefix = 'oai_dc') {
        return this.read({verb: 'GetRecord', metadataPrefix, identifier});
    }

    /**
     * A whole list, every part followed through its resumptionToken
     * ("Resume") until the last (whose token is empty), at most `maxParts`
     * parts. Returns the first part's answer with `records` and `headers`
     * of every part, and `parts`, the number read. Never for `set=driver`,
     * whose token repeats records (register A24).
     *
     * @param {'ListRecords'|'ListIdentifiers'} verb
     * @param {Record<string, string>} [args]
     */
    async listAll(verb, args = {}, {maxParts = 30} = {}) {
        const first = await this.read({verb, metadataPrefix: 'oai_dc', ...args});
        const records = [...first.records];
        const headers = [...first.headers];
        let token = first.token && first.token.value;
        let parts = 1;
        while (token && parts < maxParts) {
            const next = await this.read({verb, resumptionToken: token});
            expect(next.error, `part ${parts + 1} of ${verb} answers`).toBeNull();
            records.push(...next.records);
            headers.push(...next.headers);
            token = next.token && next.token.value;
            parts += 1;
        }
        expect(token || '', `${verb} ends within ${maxParts} parts`).toBe('');
        return {...first, records, headers, parts};
    }
}

/** The record with this identifier in a parsed answer's records, or undefined. */
function recordOf(answer, identifier) {
    return answer.records.find((r) => r.header && r.header.identifier === identifier);
}

/** The live (not deleted) records' Dublin Core titles, in list order. */
function liveTitles(answer) {
    return answer.records.filter((r) => r.header && !r.header.deleted && r.dc).map((r) => r.dc.title[0]);
}

// ---------------------------------------------------------------------------
// The browser view ("OAI 2.0 Request Results")
// ---------------------------------------------------------------------------

/** Anchor a label: the exact words, whatever the padding around them. */
function whole(text) {
    return new RegExp(`^\\s*${String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
}

class OaiView extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.heading = page.getByRole('heading', {level: 1, name: OAI_TEXT.pageTitle, exact: true});
    }

    /** Open an address with a request; waits for the page's heading. Returns the navigation's response. */
    async open(contextPath, params = '') {
        const response = await this.page.goto(oaiPath(contextPath, params));
        await this.expectLoaded();
        return response;
    }

    async expectLoaded() {
        await expect(this.heading).toBeVisible({timeout: T});
    }

    /** The two rows of request links: 'top' (under the heading) or 'bottom' (above "About the XSLT"). */
    quickLinkRow(where) {
        const rows = this.page.locator('ul.quicklinks');
        return where === 'top' ? rows.first() : rows.last();
    }

    /** The link names of one row of request links. */
    async quickLinkNames(where) {
        await expect(this.quickLinkRow(where)).toBeVisible({timeout: T});
        return (await this.quickLinkRow(where).getByRole('link').allInnerTexts()).map((t) => t.trim());
    }

    /** Press a request link of the top row; waits for the next page. */
    async pressQuickLink(name) {
        await this.quickLinkRow('top').getByRole('link', {name, exact: true}).click();
        await this.page.waitForLoadState('load');
        await this.expectLoaded();
    }

    /** The intro sentence under the links. */
    intro() {
        return this.page.locator('p.intro');
    }

    /** The "About the XSLT" heading. */
    aboutXslt() {
        return this.page.getByRole('heading', {name: OAI_TEXT.aboutXslt, exact: true});
    }

    /** "Request was of type {verb}." */
    requestType() {
        return this.page.getByText(/^Request was of type \w+\.$/);
    }

    /** The value cells of every row with this key ("Request URL", "Repository Name", …), in a scope. */
    values(key, scope = null) {
        const root = scope || this.page;
        return root
            .locator('tr')
            .filter({has: this.page.locator('td.key', {hasText: whole(key)})})
            .locator('td.value');
    }

    /** One row's value, its text trimmed. */
    async value(key, scope = null) {
        const cell = this.values(key, scope).first();
        await expect(cell).toBeVisible({timeout: T});
        return (await cell.innerText()).trim();
    }

    /** Every value of a key in a scope, trimmed. */
    async valueList(key, scope = null) {
        return (await this.values(key, scope).allInnerTexts()).map((t) => t.trim());
    }

    /** The "setSpec" values in a scope, without the "Identifiers" and "Records" links' words. */
    async setSpecs(scope = null) {
        return (await this.valueList('setSpec', scope)).map((v) => v.replace(/\s*Identifiers\s+Records\s*$/, ''));
    }

    /** The "OAI Identifier" in a record's block, without the "oai_dc" and "formats" links' words. */
    async identifierIn(scope) {
        return (await this.value('OAI Identifier', scope)).replace(/\s*oai_dc\s+formats\s*$/, '');
    }

    /** The error block: its heading, its sentence, "Error Code" and the message. */
    errorHeading() {
        return this.page.getByRole('heading', {name: OAI_TEXT.errorsHeading, exact: true});
    }

    errorIntro() {
        return this.page.getByText(OAI_TEXT.errorsIntro, {exact: true});
    }

    errorMessage() {
        return this.page.locator('p.error');
    }

    /** The "Set" blocks' tables. */
    setBlocks() {
        return this.page.locator('h2:text-is("Set") + table');
    }

    /** The "Set" block whose setName is `name`. */
    setBlock(name) {
        return this.setBlocks().filter({has: this.page.locator('td.value', {hasText: whole(name)})});
    }

    /** The "Metadata Format" blocks' tables. */
    formatBlocks() {
        return this.page.locator('h2:text-is("Metadata Format") + table');
    }

    /** The heading of a record's block ("OAI Record: {identifier}"). */
    recordHeading(identifier) {
        return this.page.locator('h2.oaiRecordTitle').filter({hasText: whole(`OAI Record: ${identifier}`)});
    }

    /** The headings of every record block on the page, as their identifiers. */
    async recordIdentifiers() {
        return (await this.page.locator('h2.oaiRecordTitle').allInnerTexts()).map((t) => t.replace(/^\s*OAI Record:\s*/, '').trim());
    }

    /** A record's block (header and metadata) by its identifier. */
    record(identifier) {
        return this.recordHeading(identifier).locator('xpath=following-sibling::div[1]');
    }

    /** The link "Resume" of a list with more to come. */
    resumeLink() {
        return this.page.getByRole('link', {name: 'Resume', exact: true});
    }

    /**
     * Find a record on a list page, pressing "Resume" until its block shows
     * (a harvester's walk; at most `maxParts` parts). Returns the block.
     */
    async findRecord(identifier, {maxParts = 30} = {}) {
        for (let part = 1; part <= maxParts; part += 1) {
            if (await this.recordHeading(identifier).count()) return this.record(identifier);
            if (!(await this.resumeLink().count())) break;
            await this.resumeLink().click();
            await this.page.waitForLoadState('load');
            await this.expectLoaded();
        }
        await expect(this.recordHeading(identifier), `the record ${identifier} on the list`).toHaveCount(1);
        return this.record(identifier);
    }
}

// ---------------------------------------------------------------------------
// Settings › Distribution › "Access": "Enable OAI"
// ---------------------------------------------------------------------------

class EnableOaiField extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{panel: () => import('@playwright/test').Locator, save: () => Promise<any>}} access
     *   SubscriptionsPages' AccessSettings (its tab panel and "Save")
     */
    constructor(page, contextPath, access) {
        super(page);
        this.contextPath = contextPath;
        this.access = access;
    }

    /** Open Settings › Distribution and its "Access" tab; waits for the group (any app). */
    async goto() {
        await this.page.goto(this.contextUrl(this.contextPath, '/management/settings/distribution'));
        await this.page.getByRole('tab', {name: 'Access', exact: true}).click();
        await expect(this.group()).toBeVisible({timeout: T});
    }

    /** The "Enable OAI" group. */
    group() {
        return this.access.panel().getByRole('group', {name: OAI_TEXT.enableOai, exact: true});
    }

    /** The tab's groups by name, in page order ("Publishing Mode", "Enable OAI", …). */
    async groupNames() {
        return this.access.panel().getByRole('group').evaluateAll((groups) =>
            groups.map((g) => ((g.querySelector('legend') || {}).textContent || '').replace(/\s+/g, ' ').trim()));
    }

    /** The group's text: the legend, the help line and the two labels. */
    async groupLines() {
        return (await this.group().innerText()).split('\n').map((l) => l.trim()).filter(Boolean);
    }

    /** The help line's link ("Open Archives Initiative"). */
    helpLink() {
        return this.group().getByRole('link');
    }

    /** "Enable" or "Disable". */
    radio(label) {
        return this.group().getByRole('radio', {name: label, exact: true});
    }

    /** Choose "Enable" or "Disable" and "Save": bounded by the save's answer, then "Saved". */
    async choose(label) {
        await this.radio(label).check();
        return this.access.save();
    }
}

// ---------------------------------------------------------------------------
// Settings › Website › "Plugins" › "Installed Plugins"
// ---------------------------------------------------------------------------

class PluginGrid extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.grid = page.locator('#pluginGridContainer');
    }

    /**
     * Open Settings › Website › "Plugins" (leaving the page first: a
     * hash-only goto reloads nothing, pitfall 17) and wait for the grid's
     * rows. Every load also fires the Plugin Gallery grid's server 500, a
     * *Plugins management* finding (U62), not this feature's.
     */
    async goto() {
        await this.page.goto('about:blank');
        await this.page.goto(this.contextUrl(this.contextPath, '/management/settings/website'));
        await this.page.locator('#plugins-button').click();
        await expect(this.grid.locator('tr.gridRow').first()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /**
     * A plugin's row by its name cell (the ids are mixed-case, ccK1). An
     * enabled plugin with settings reads "Settings {name}" there (pitfall
     * 10), so the name is matched at the cell's end, as a whole word run:
     * "MARC Metadata Format" never matches "MARC21 Metadata Format".
     */
    row(name) {
        const re = new RegExp(`(^|\\s)${String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
        return this.grid.locator('tr.gridRow').filter({has: this.page.getByRole('cell', {name: re})});
    }

    /** A category's heading row ("OAI Metadata Format Plugins", "Generic Plugins"). */
    categoryRow(label) {
        return this.grid.locator('tr.gridRow').filter({has: this.page.locator('.label', {hasText: whole(label)})});
    }

    /**
     * The heading of the category a plugin's row sits under: its label,
     * without the plugin count that follows it on the row (U62 Rule 4).
     */
    async categoryOf(name) {
        const heading = this.row(name)
            .locator('xpath=ancestor::tbody[1]/tr[1]')
            .locator('.label')
            .first();
        return (await heading.innerText()).replace(/\s+/g, ' ').trim();
    }

    /** The row's "Enabled" box. */
    box(name) {
        return this.row(name).getByRole('checkbox');
    }

    /**
     * Tick or untick a plugin's box; unticking answers the question "OK".
     * Bounded by the grid's answer. Returns the question's words, or null.
     *
     * @param {string} name
     * @param {boolean} want
     */
    async setEnabled(name, want) {
        const answered = this.page.waitForResponse(
            (r) => new RegExp(`plugin-grid/${want ? 'enable' : 'disable'}`).test(r.url()) && r.request().method() === 'POST',
            {timeout: T}
        );
        await this.box(name).click();
        let question = null;
        if (!want) {
            const dialog = this.page.getByRole('dialog').filter({hasText: OAI_TEXT.disableQuestion}).last();
            await expect(dialog).toBeVisible({timeout: T});
            question = (await dialog.innerText()).replace(/\s+/g, ' ').trim();
            await dialog.getByRole('button', {name: 'OK', exact: true}).click();
        }
        const response = await answered;
        expect(response.status(), 'the plugin grid answers').toBe(200);
        await waitForJQueryIdle(this.page);
        await expect(this.box(name)).toBeChecked({checked: want, timeout: T});
        return question;
    }

    /** The row's arrow, then its "Settings" link: the window it opens. */
    async openSettings(name) {
        const row = this.row(name);
        await row.locator('a.show_extras').click();
        const controls = row.locator('xpath=following-sibling::tr[1]');
        await controls.getByRole('link', {name: 'Settings', exact: true}).click();
    }
}

/** The "JATS Metadata Format" plugin's "Settings" window {OJS}. */
class JatsFormatWindow extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.box = page.locator('input[name="forceJatsTemplate"]');
        this.dialog = page.getByRole('dialog').filter({has: this.box});
        this.title = this.dialog.getByRole('heading', {level: 1});
        this.okButton = this.dialog.getByRole('button', {name: 'OK', exact: true});
        this.cancelLink = this.dialog.getByRole('link', {name: 'Cancel', exact: true});
    }

    /** Wait until the window's form has arrived (it loads by AJAX after the dialog opens). */
    async waitOpen() {
        await expect(this.box).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** The box by its label. */
    labelledBox() {
        return this.dialog.getByRole('checkbox', {name: OAI_TEXT.ignoreUploaded, exact: true});
    }

    /** The window's text, whitespace folded. */
    async text() {
        return (await this.dialog.innerText()).replace(/\s+/g, ' ').trim();
    }

    /** A heading inside the window's form ("Settings"). */
    formHeading(name) {
        return this.dialog.getByRole('heading', {name, exact: true});
    }

    /** "OK" the server accepts: the save's answer, the window closed, "Your changes have been saved.". */
    async okAccepted() {
        const answer = this.page.waitForResponse((r) => r.request().method() === 'POST' && /\/manage\b/.test(r.url()), {timeout: T});
        await this.okButton.click();
        const response = await answer;
        expect(response.status(), 'the window\'s save answers').toBe(200);
        await waitForJQueryIdle(this.page);
        await expect(this.box).toHaveCount(0, {timeout: T});
        await expect(this.page.getByText(OAI_TEXT.saved).first()).toBeVisible({timeout: T});
    }
}

// ---------------------------------------------------------------------------
// Administration › Hosted Journals (Presses, Servers) › "Edit"
// ---------------------------------------------------------------------------

class HostedContextEditWindow extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {{hostedLabel: string}} labels "Hosted Journals" / "Hosted Presses" / "Hosted Servers"
     */
    constructor(page, labels) {
        super(page);
        this.list = new HostedContextsPage(page, labels);
        this.publicBox = page.getByRole('checkbox', {name: /appear publicly on the site/});
        this.dialog = page.getByRole('dialog').filter({has: this.publicBox});
        this.countrySelect = this.dialog.locator('select[id^="context-country-control"]');
        this.saveButton = this.dialog.getByRole('button', {name: 'Save', exact: true});
    }

    /** Administration › "Hosted …", the context's row arrow, then "Edit"; waits for the form. */
    async open(contextPath) {
        await this.list.gotoFromAdministration();
        const row = this.list.row(contextPath).first();
        await row.locator('a.show_extras').click();
        await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true}).click();
        await expect(this.publicBox).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** The public box's label ("Enable this journal to appear publicly on the site"). */
    async publicBoxLabel() {
        return this.publicBox.evaluate((box) => ((box.closest('label') || {}).textContent || '').replace(/\s+/g, ' ').trim());
    }

    /** "Save": bounded by the context's save answer; returns it. The window closes on success. */
    async save() {
        const answer = this.page.waitForResponse(
            (r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET',
            {timeout: T}
        );
        await this.saveButton.click();
        return answer;
    }
}

// ---------------------------------------------------------------------------
// Administration › Site Settings › "Information"
// ---------------------------------------------------------------------------

/**
 * The site's "Email of principal contact" as Administration › Site
 * Settings › "Information" shows it (read as the Site Administrator).
 *
 * @param {import('@playwright/test').Page} page
 */
async function siteContactEmail(page) {
    await page.goto('/index.php/index/admin/settings');
    await page.getByRole('tab', {name: 'Information', exact: true}).filter({visible: true}).first().click();
    const box = page.getByRole('textbox', {name: /Email of principal contact/}).first();
    await expect(box).toBeVisible({timeout: T});
    await expect(box).not.toHaveValue('', {timeout: T});
    return box.inputValue();
}

module.exports = {
    SITE_PATH,
    OAI_TEXT,
    parseOai,
    parseDc,
    parseMarc,
    marcValues,
    oaiPath,
    readOai,
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
};
