---
name: oai-pmh
status: verified
---

# OAI-PMH {OJS OMP OPS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

OAI-PMH, the Open Archives Initiative's Protocol for Metadata Harvesting,
is how indexing services, library catalogues and aggregators
(*harvesters*, see [Harvesting](GLOSSARY.md#harvesting)) collect a
journal's metadata without reading its pages. Every journal answers
harvesting requests at its own OAI address, and the site answers for all
its journals at a site-wide one. A harvester asks for the journal's
description, its sets (the journal and each of its sections), the
metadata formats it offers, or its records, one per published article,
each in a format such as Dublin Core. An article that stops being
published stays in the list as a deleted record, so the harvester knows
to drop it ⚠ [A1](#a1). No page of the app links to the address: a journal hands it
to the services it wants to be harvested by. A Journal Manager can
withhold a journal's records with "Enable OAI" {OJS OPS}; on a journal
the "JATS Metadata Format" and "DRIVER" plugins add a JATS format and an
open-access set {OJS}. On a press each record describes one publication
format of a published book [OMP1](#omp1), and Dublin Core is the only
format a press or a preprint server offers. <sup>a</sup>

## Actors & permissions

The OAI address needs no account: a harvester signs in as nobody. A
signed-in browser is answered as signed in, even where a signed-out one
is sent to Login (Rule 18). Its answer is the same as a signed-out
one's, with one exception {OJS}: in the `jats` format a signed-in
Journal Manager or Section Editor is also served the articles a
harvester is refused (Rule 21a), with the contributors' email
addresses; a signed-in Reader gets the harvester's answer.
"Whoever opens the Settings pages" means the manager-level
roles with "Permit changes to Settings", as
[→ settings access](U07-journal-identity-and-about-pages.md#settings-access)
defines them, and the Site Administrator working in the journal.
<sup>b</sup> <sup>q1</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Send any request to a journal's OAI address** (Rules 1–15) | • anyone, signed out included, while the install's OAI interface is switched on (Settings bullet 14) <sup>t</sup><br>• on a journal that requires visitors to sign in, or that is not enabled publicly, a signed-out request is sent to the Login page instead (Rule 18) <sup>b</sup> |
| **Send any request to the site-wide address** (Rule 16) | • anyone, signed out included <sup>b</sup> |
| **Choose "Enable OAI"** {OJS OPS} (Rule 17) | • whoever opens the Settings pages, on Settings › Distribution › "Access" <sup>o</sup> |
| **Enable or disable "JATS Metadata Format"** {OJS} (Rule 21) **and "DRIVER"** {OJS} (Rule 23) | • whoever opens the Settings pages, on Settings › Website › "Plugins" › "Installed Plugins", under "OAI Metadata Format Plugins" and "Generic Plugins"; *Plugins management* owns the list, its confirmations and its messages<br>• nobody can untick "DC Metadata Format", or {OJS} "MARC Metadata Format" and "MARC21 Metadata Format": their boxes show ticked and cannot be pressed <sup>p</sup> <sup>q2</sup> |
| **Open the "JATS Metadata Format" "Settings" window and save it** {OJS} (Rule 22) | • whoever opens the Settings pages, from "Settings" among the plugin row's actions, offered only while the plugin is enabled <sup>h</sup> <sup>q3</sup> |

## Fields & validation

**The two addresses.** `{journal address}` is the journal's home page
address, such as `https://example.org/index.php/journal`, and
`{site address}` the install's own, such as `https://example.org`. A
request is the address followed by `?verb=` and the request's name, then
its arguments, each `&name=value`: for example
`{journal address}/oai?verb=ListRecords&metadataPrefix=oai_dc`. <sup>c</sup>

| Address | Answers for |
|---------|-------------|
| {journal address}/oai | the journal alone (Rules 3–15) <sup>c</sup> |
| {site address}/index.php/index/oai | every journal of the site (Rule 16) <sup>c</sup> |

On a journal (and on the site) with more than one language, the plain
address first sends the request on to the address with a language in
it, such as `{journal address}/en/oai` (Rule 19a), and "Base URL" and
"Request URL" read that address; `{journal address}/fr_CA/oai` answers
where it was sent. A journal with one language answers at
`{journal address}/oai`. <sup>c</sup> <sup>u</sup>

**The six requests.** The request names and argument names are written
exactly as below, capitals included. <sup>c</sup>

| Request (`verb`) | Required arguments | Optional arguments | Answer |
|------------------|--------------------|--------------------|--------|
| Identify | — | — | the repository's description (the table "Identify" below) <sup>c</sup> |
| ListMetadataFormats | — | `identifier` | the formats offered (Rule 10) <sup>c</sup> |
| ListSets | — | `resumptionToken` | the sets (Rule 7) <sup>c</sup> |
| ListIdentifiers | `metadataPrefix` | `from`, `until`, `set`, `resumptionToken` | the headers of the matching records, up to 500 per answer (Rule 13) <sup>c</sup> |
| ListRecords | `metadataPrefix` | `from`, `until`, `set`, `resumptionToken` | the matching records, header and metadata, up to 100 per answer (Rule 13) <sup>c</sup> |
| GetRecord | `identifier`, `metadataPrefix` | — | one record (Rule 15) <sup>c</sup> |

<a id="browser-view"></a>
**The browser view.** Every answer is XML, which a harvester reads and a
tester sees with the browser's "view source". A browser shows it as a
page titled "OAI 2.0 Request Results", top to bottom: <sup>a</sup>

- the heading "OAI 2.0 Request Results"; the links "Identify",
  "ListRecords", "ListSets", "ListMetadataFormats" and "ListIdentifiers",
  each opening that request on the same address ("ListRecords" and
  "ListIdentifiers" in `oai_dc`); and "You are viewing an HTML version of
  the XML OAI response. To see the underlying XML use your web browsers
  view source option. More information about this XSLT is at the bottom
  of the page."; <sup>a</sup>
- a table with "Datestamp of response" and "Request URL" (the OAI
  address that answered, without the arguments); <sup>a</sup>
- for a refused request, "OAI Error(s)", "The request could not be
  completed due to the following error or errors.", an "Error Code" row
  and the message (the table "Errors" below); otherwise "Request was of
  type {request}." and the answer; <sup>a</sup>
- the same five links again, "About the XSLT" and a paragraph on where
  the page's layout comes from. <sup>a</sup>

The answer's parts, as the page shows them: <sup>a</sup>

| Answer | What the page shows |
|--------|---------------------|
| Identify | a table with "Repository Name", "Base URL", "Protocol Version", "Earliest Datestamp", "Deleted Record Policy", "Granularity" and "Admin Email"; a block "OAI-Identifier" with "Scheme", "Repository Identifier", "Delimiter" and "Sample OAI Identifier"; a block "Unsupported Description Type", "The XSL currently does not support this type of description.", with the software's description as text <sup>a</sup> |
| ListSets | one block "Set" per set, with "setName", "setSpec" and the links "Identifiers" and "Records" (that set's lists in `oai_dc`) <sup>a</sup> |
| ListMetadataFormats | "This is a list of metadata formats available from this archive.", then one block "Metadata Format" per format, with "metadataPrefix" (a link listing the records in that format), "metadataNamespace" and "schema" (a link) ⚠ [A5](#a5) <sup>a</sup> |
| A record (ListRecords, GetRecord) | a heading "OAI Record: {identifier}"; a block "OAI Record Header" with "OAI Identifier" and the links "oai_dc" (the record in Dublin Core) and "formats" (its formats), "Datestamp", and one "setSpec" row per set with the links "Identifiers" and "Records" (that set's lists in `oai_dc`); "This record has been deleted." under a deleted record's header; then the metadata: "Dublin Core Metadata (oai_dc)" with the rows of the table "The Dublin Core record", or "Unknown Metadata Format" and the record's XML as text for any other format <sup>a</sup> |
| A header (ListIdentifiers) | the block "OAI Record Header" alone, as above <sup>a</sup> |
| A list with more to come | "There are more results." and a table with "expirationDate", "completeListSize", "cursor" and "resumptionToken:" followed by the link "Resume" (Rule 13) <sup>a</sup> |

<a id="identify"></a>
**Identify.** What a journal says about itself. <sup>d</sup>

| Part (the page's label) | Content |
|-------------------------|---------|
| Repository Name | the journal's name, in the language of the request (Rule 19) <sup>d</sup> |
| Base URL | the OAI address that answered, with its language on a journal with more than one (Rule 19a) <sup>d</sup> |
| Protocol Version | "2.0" <sup>d</sup> |
| Earliest Datestamp | the datestamp of the oldest record the address lists, deleted records included (Rule 5); with none listed, the moment of the request ⚠ [A1](#a1) <sup>d</sup> |
| Deleted Record Policy | "persistent" <sup>d</sup> |
| Granularity | "YYYY-MM-DDThh:mm:ssZ" <sup>d</sup> |
| Admin Email | the email address of the journal's "Principal Contact" (Settings › Journal › "Contact") <sup>d</sup> |
| OAI-Identifier › Scheme · Repository Identifier · Delimiter | "oai" · the install's repository identifier (Settings bullet 14), written `{repository identifier}` below · ":" <sup>d</sup> |
| OAI-Identifier › Sample OAI Identifier | "oai:{repository identifier}:article/1" on a journal, "…:publicationFormat/1" on a press, "…:preprint/1" on a preprint server <sup>d</sup> |
| Unsupported Description Type (the software) | "Open Journal Systems", "Open Monograph Press" or "Open Preprint Systems", the installed version, and the product's address at pkp.sfu.ca <sup>d</sup> |

The XML also offers `gzip` and `deflate` compression, which the page
does not show. <sup>d</sup>

<a id="header"></a>
**A record's header.** <sup>e</sup> <sup>j</sup>

| Part | Content |
|------|---------|
| OAI Identifier | on a journal "oai:{repository identifier}:article/{ID}", `{ID}` being the submission's ID (the number the Dashboard lists it under); on a press "oai:{repository identifier}:publicationFormat/{format number}" [OMP1](#omp1); on a preprint server "oai:{repository identifier}:preprint/{ID}". An earlier version has an identifier of its own on a journal that versions its DOIs (Rule 20) ⚠ [A22](#a22) <sup>e</sup> |
| Datestamp | the record's last change, such as "2026-09-26T10:15:00Z" (Rule 5) <sup>e</sup> |
| setSpec | the set of the article's section, "{journal path}:{section abbreviation}" (Rule 7); on a press the book's series, or the press alone for a book in no series; with "DRIVER" on, a second row "driver" (Rule 23) <sup>e</sup> |

<a id="formats"></a>
**The formats** a journal can offer, as the "Installed Plugins" list
names their plugins (Rule 10): <sup>p</sup>

| `metadataPrefix` | Plugin row ("OAI Metadata Format Plugins") | Apps | On a new journal |
|------------------|--------------------------------------------|------|------------------|
| `oai_dc` | "DC Metadata Format" | OJS OMP OPS | always on <sup>p</sup> |
| `oai_marc` | "MARC Metadata Format" | OJS | always on <sup>p</sup> |
| `marcxml` | "MARC21 Metadata Format" | OJS | always on <sup>p</sup> |
| `jats` | "JATS Metadata Format" | OJS | off (Rule 21) <sup>p</sup> |

<a id="dc"></a>
**The Dublin Core record** (`oai_dc`), row by row under the page's
labels. A value the item has in several languages is written once per
language, each marked with its language. <sup>f</sup>

| Row | Journal | Press | Preprint server |
|-----|---------|-------|-----------------|
| Title | each language's title, followed by ": " and the subtitle when there is one | the same | the same <sup>f</sup> <sup>q13</sup> |
| Author or Creator | each contributor as "{family name}, {given name}", once per language the name is given in | the same | the same <sup>f</sup> <sup>q13</sup> |
| Subject and Keywords | each keyword, then each subject, by its name | the same | the same <sup>f</sup> <sup>q13</sup> |
| Description | the abstract, its formatting removed | the same; a book without an abstract ⚠ [OMP4](#omp4) | the same; a preprint without an abstract ⚠ [OPS2](#ops2) <sup>f</sup> <sup>q13</sup> |
| Publisher | the journal's "Publisher" (Settings › Journal › "Masthead"), else the journal's name in each of its languages | the press's "Press Publisher Name", else its name | the server's name in each of its languages <sup>f</sup> <sup>q13</sup> |
| Other Contributor | never shown ⚠ [A6](#a6) | never shown | never shown <sup>f</sup> <sup>q13</sup> |
| Date | the version's publication date, "YYYY-MM-DD" | the same | the same <sup>f</sup> <sup>q13</sup> |
| Resource Type | "info:eu-repo/semantics/article"; the section's "Identify items published in this section as a(n)", or "Peer-reviewed Article" for a section never saved in its window ⚠ [A7](#a7); the version's "Type" when set; "info:eu-repo/semantics/publishedVersion" | "Book", in the language of the request [A13](#a13), and the version's "Type" when set | "info:eu-repo/semantics/preprint" and "info:eu-repo/semantics/draft" ⚠ [OPS3](#ops3) <sup>f</sup> <sup>q13</sup> |
| Format | each galley's file type, such as "application/pdf" | the format's "Publication Format" entry with its code, such as "Digital (on physical carrier) (DA)" | each galley's file type <sup>f</sup> <sup>q13</sup> |
| Resource Identifier | the article page's address (not on a journal that does not publish online, Rule 11a); the version's DOI when it has one; a "Publisher ID" is not written | the book page's address; the format's identifiers and DOI | the preprint page's address; the version's DOI <sup>f</sup> <sup>q13</sup> |
| Source | per language, "{journal name}; {issue}; {pages}", the issue as "Vol. 1 No. 2 (2026)" and, when the version has no "Pages", its "Article Number" ⚠ [A8](#a8); then the online and print ISSN, and the issue's DOI | "{press name}; " per language [A8](#a8) | none <sup>f</sup> <sup>q13</sup> |
| Language | the submission's language code, such as "en", and each galley's, as its locale code, such as "fr_CA" ⚠ [A14](#a14) | the submission's language as three letters, such as "eng" | as on a journal <sup>f</sup> <sup>q13</sup> |
| Relation | each galley's address (not on a journal that does not publish online), each galley's DOI, and the previous version (Rule 20b) | each format file's download address, the book's DOI, the previous version | as on a journal <sup>f</sup> <sup>q13</sup> |
| Coverage | the version's "Coverage", per language | the same | the same <sup>f</sup> <sup>q13</sup> |
| Rights Management | "Copyright (c) {year} {copyright holder}", then the license's address | the format's sales rights | as on a journal <sup>f</sup> <sup>q13</sup> |

<a id="marc"></a>
**The MARC records** {OJS} (`oai_marc` and `marcxml`) carry the same
fields; the page shows either as "Unknown Metadata Format" with its XML.
By MARC field number: <sup>g</sup>

| Field | Content |
|-------|---------|
| 008 | the publication date, meant as "260926 2026", written "%26%09%26 %2026" ⚠ [A15](#a15) <sup>g</sup> <sup>q14</sup> |
| 022 | the online ISSN and the print ISSN, one field each <sup>g</sup> <sup>q14</sup> |
| 024 | the version's DOI (`marcxml` only) <sup>g</sup> <sup>q14</sup> |
| 042 | "dc" <sup>g</sup> <sup>q14</sup> |
| 251 · 500 · 780 | the version, such as "Version of Record 1.0" [A13](#a13); its "Summary of Changes", markup included (such as "<p>…</p>"); the previous version, named and linked by DOI or address (Rule 20b) <sup>g</sup> <sup>q14</sup> |
| 245 | the title in the journal's primary language, without the subtitle <sup>g</sup> <sup>q14</sup> |
| 100 or 720 | a lone contributor under 100, several each under 720: "{family name}, {given name}", then each affiliation (its ROR identifier, else its name), the contributor's URL and a verified ORCID iD <sup>g</sup> <sup>q14</sup> |
| 653 | each discipline, then each subject, by its name, in the submission's language <sup>g</sup> <sup>q14</sup> |
| 520 | the abstract, as plain text <sup>g</sup> <sup>q14</sup> |
| 260 | the publisher (the journal's "Publisher", else its name); then the issue's publication date, for an article in an issue <sup>g</sup> <sup>q14</sup> |
| 655 | the section's "Identify items published in this section as a(n)", when filled <sup>g</sup> <sup>q14</sup> |
| 856 | each galley's file type; the article page's address <sup>g</sup> <sup>q14</sup> |
| 773 | the journal's name followed by ";", then the issue and the pages (else the "Article Number") joined by ", ", such as "Vol. 1 No. 1 (2026), 15-20" <sup>g</sup> <sup>q14</sup> |
| 546 | the submission's language as three letters <sup>g</sup> <sup>q14</sup> |
| 500 | the version's "Coverage" <sup>g</sup> <sup>q14</sup> |
| 540 | "Copyright (c) {year} {copyright holder}" <sup>g</sup> <sup>q14</sup> |

The `marcxml` record declares the MARC21 schema but does not follow it
in every field, and the `oai_marc` record spells its subfields two ways
⚠ [A12](#a12). <sup>g</sup> <sup>q4</sup>

**The JATS record** {OJS} (`jats`): the article as a JATS document, the
one the "JATS Template Plugin" generates for the version ([JATS & Body
Text](U48-jats-and-body-text.md#generated)), with the body and back
matter of the article's XML galley when it has one (Rule 22), the
collection year (the issue's year, else the publication year), the
submission's language, and, for a harvester, no contributor's email
address (Actors). <sup>h</sup> <sup>q5</sup>

**"Enable OAI"** {OJS OPS}, on Settings › Distribution › "Access" (after
"Publishing Mode", and "Delayed Open Access" when it shows, on a
journal, after "Posting
Mode" on a preprint server; *Subscriptions & open access control* owns
those fields). <sup>o</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Enable OAI", under it "Provide metadata to third-party indexing services through the Open Archives Initiative." (the last three words a link to openarchives.org) | one is always chosen | Two round buttons, "Enable" and "Disable"; a new journal arrives with "Enable". The tab's "Save" stores it with the tab's other fields and shows "Saved". Rule 17 <sup>q6</sup> |

**The "JATS Metadata Format" "Settings" window** {OJS} (Settings ›
Website › "Plugins" › "Installed Plugins" › "OAI Metadata Format
Plugins": the arrow beside "JATS Metadata Format" opens the row's
actions, "Settings" among them). The window is titled "JATS Metadata
Format" and opens with "This plugin provides metadata to external
services in the JATS XML format via the OAI-PMH interface. When used in
conjunction with the JATS Template plugin, it can function even if JATS
XML documents have not been uploaded into OJS.", under which a heading
"Settings" carries one box; it closes with "Cancel" and "OK", above
"Required fields are marked with an asterisk: *" although nothing carries
one. "OK" saves and closes it with "Your changes have been saved.";
"Cancel" closes it at once and saves nothing. The window's "Close", at
its top, with the box changed asks "The data on this form has changed.
Do you wish to continue without saving?", and the window stays open
when the question is dismissed. <sup>h</sup> <sup>q3</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Ignore uploaded JATS XML documents" | No | A tick box, unticked on a new journal. Rule 22 <sup>h</sup> |

<a id="errors"></a>
**Errors.** A refused request answers with one error code and one
message. <sup>m</sup>

| Error Code | Message | When |
|------------|---------|------|
| badVerb | "Illegal OAI verb" | no request name, or one that is not among the six (as written: "identify" is refused) <sup>m</sup> |
| badArgument | "Missing {argument} parameter" | a required argument is missing <sup>m</sup> |
| badArgument | "Multiple values are not allowed for the {argument} parameter" | never answered: an argument given twice fails instead ⚠ [A16](#a16) <sup>m</sup> |
| badArgument | "{argument} is an illegal parameter" | an argument the request does not take, or any argument beside `resumptionToken` (Rule 13) <sup>m</sup> |
| badArgument | "Identifier is not in a valid format" | a GetRecord `identifier` not of the shape the table "A record's header" gives; {OMP OPS} only one without the app's `oai:{repository identifier}:publicationFormat/` (`…:preprint/`) start ⚠ [A17](#a17) <sup>m</sup> |
| badArgument | "Illegal from parameter" · "Illegal until parameter" | a date not written "YYYY-MM-DD" or "YYYY-MM-DDThh:mm:ssZ" (Rule 9) <sup>m</sup> |
| badArgument | "until parameter must be greater than or equal to from parameter" · "until and from parameters must be of the same granularity" | Rule 9 <sup>m</sup> |
| idDoesNotExist | "No matching identifier in this repository" | GetRecord, or ListMetadataFormats with `identifier`, for a record this address does not hold (Rule 15) <sup>m</sup> |
| cannotDisseminateFormat | "The requested metadataPrefix is not supported by this repository" | a format this address does not offer (Rule 10) <sup>m</sup> |
| cannotDisseminateFormat | "Cannot disseminate format (unauthenticated access to JATS XML not allowed)" · "Cannot disseminate format (JATS XML not available)" | {OJS} Rule 21 <sup>m</sup> |
| noRecordsMatch | "No matching records in this repository" | nothing matches a ListRecords or ListIdentifiers (Rules 3, 8, 9, 17) <sup>m</sup> |
| badResumptionToken | "The requested resumptionToken is invalid or has expired" | Rule 13 <sup>m</sup> |

## Rules & state

1. **Reached by its address.** The OAI address answers requests; no
   page, menu or email of the app links to it, and the journal's pages
   carry no link to it. Its answers are the XML the Fields section
   describes, shown by a browser as the page of "The browser view".
   <sup>a</sup>
2. **How a request is read.** A request's name and arguments are read
   from the address (or from a form sent to it). A request with a name
   or argument it does not take is refused, as the table "Errors" says;
   the answer to a refused name or a wrong argument does not repeat the
   request's arguments. <sup>c</sup> <sup>m</sup>
3. **What a journal lists.** A journal's address lists one record per
   article of that journal whose current version is published. An
   article still in the workflow, one scheduled in an issue that is not
   yet published, a declined one and another journal's articles are not
   listed. A record describes the article's current published version.
   <sup>e</sup> <sup>q7</sup>
   - 3a. {OMP} On a press, each record is one publication format of a
     published book, made available to readers; a book with no such
     format has no record [OMP1](#omp1). <sup>e</sup>
   - 3b. {OPS} On a preprint server, each record is one posted preprint.
     <sup>e</sup>
4. **Deleted records.** When an article stops being published, its
   record stays in the lists with the same identifier, its header marked
   deleted ("This record has been deleted." on the page), a datestamp of
   that moment, its set as before, and no metadata. This happens when its
   only published version is unpublished with "Unpublish", and {OJS}
   when its issue is unpublished or deleted. Published again, the record
   is back with the same identifier. <sup>n</sup> <sup>q8</sup>
   - 4a. {OMP} On a press, a format taken out of availability becomes a
     deleted record; unpublishing a book turns each of its formats into
     one. Once a new version of a book is published, the press lists its
     formats under new identifiers and leaves no deleted record for the
     old ones ⚠ [OMP7](#omp7). <sup>n</sup>
   - 4b. {OJS OMP} The address of every journal but the install's first
     (created first, whatever the Hosted Journals order: the seeded
     journal) leaves out its own deleted records ⚠ [A1](#a1); without
     a `set`, it lists the first journal's instead. The site-wide
     address lists every journal's, but not a journal's that `set`
     names. <sup>n</sup> <sup>q8</sup>
5. **Datestamps.** On a journal a record's datestamp is its last change:
   the latest change to the article, its current version or its issue.
   On a press and a preprint server it stays at the time the item was
   published ⚠ [A18](#a18): a saved edit of the published version does
   not move it, and an item published again after "Unpublish"
   ("Unpost") comes back with its earlier datestamp, older than its
   deleted record's. A deleted record's datestamp is the moment it was
   deleted. <sup>e</sup> <sup>q9</sup>
6. **Order.** A list gives a journal's records in the order of their
   submission ID, lowest first (on a press, of the format number).
   {OMP} A press lists the first press's deleted records (Rule 4b)
   before its own. The site-wide address lists the records journal by
   journal, then every journal's deleted records together at the end. <sup>e</sup> <sup>q8</sup> <sup>q9</sup>
7. **Sets.** ListSets names the journal as a set, its `setSpec` the
   journal's path and its `setName` the journal's name, then each of its
   sections: `setSpec` "{journal path}:{abbreviation}", `setName` the
   section's title. <sup>j</sup> <sup>q10</sup>
   - 7a. A section "Abbreviation" keeps only letters, digits and
     `-_.!~*'()` in its `setSpec`: accents are dropped from letters and
     spaces and other signs removed ("É D" becomes "ED").
   - 7b. {OMP} A press lists its series instead, `setSpec`
     "{press path}:{series path}" and `setName` the series' "Prefix" and
     "Title" joined by a space, so a series with no prefix reads
     " Series One" ⚠ [OMP6](#omp6). A book in no series belongs to the
     press's set only.
   - 7c. A section that no longer exists stays listed, under its old
     name, while deleted records remain in it; asking for that set
     answers "No matching records in this repository", at the journal's
     address and the site-wide one ⚠ [A19](#a19).
   - 7d. Each record's header names one set, its section's (on a press,
     its series', or the press's for a book in no series).
8. **Asking for a set.** `set` with the journal's path lists all its
   records; with "{journal path}:{abbreviation}" the records of that
   section. A set of another journal, or one the journal does not have,
   answers "No matching records in this repository". A press given a
   set it does not have lists other records instead ⚠ [OMP3](#omp3).
   <sup>j</sup> <sup>q10</sup>
9. **Dates.** `from` and `until` limit a list to the records whose
   datestamp falls between them, both days included; each is written
   "YYYY-MM-DD" or "YYYY-MM-DDThh:mm:ssZ", both the same way, and `until`
   may not come before `from` (the table "Errors"). <sup>l</sup>
   <sup>q11</sup>
   - 9a. The time of day is ignored: every record changed on the day of
     `from` or `until` is listed, whatever its time ⚠ [A2](#a2).
   - 9b. A date that is not in the calendar is not refused ⚠ [A3](#a3):
     "2026-02-30" reads as 2 March; "2026-13-01" lists as if no date had
     been given when it is `from`, and lists nothing when it is `until`;
     a time not on the clock, such as `from=2026-09-26T25:00:00Z`, is
     accepted as if no date had been given.
   - 9c. {OPS} On a preprint server, any list with `until` fails with a
     server error ⚠ [OPS1](#ops1).
   - 9d. {OJS OPS} Asked together with a section's `set`, `from` and
     `until` do not limit the deleted records: the section's deleted
     records are listed whatever the dates say ⚠ [A20](#a20).
10. **Formats.** ListMetadataFormats lists the formats the address
    offers (the table "The formats"), the same for every record when an
    `identifier` is given. A ListRecords, ListIdentifiers or GetRecord in
    a format not listed answers "The requested metadataPrefix is not
    supported by this repository". <sup>p</sup> <sup>q12</sup>
11. **What a Dublin Core record shows.** The rows of the table "The
    Dublin Core record", taken from the article's current published
    version. Keywords, subjects and disciplines are named as typed, never
    "Array". <sup>f</sup> <sup>q13</sup>
    - 11a. {OJS} On a journal that does not publish online ("OJS will not
      be used to publish the journal's contents online."), the record
      carries neither the article page's address nor the galleys' ⚠
      [A9](#a9).
12. **What a MARC record shows** {OJS}. The fields of the table "The
    MARC records". A discipline or subject reads as its name. An
    article in no issue has no issue part in 773 and no issue date in
    field 260. <sup>g</sup> <sup>q14</sup>
13. **Paging.** A list longer than one answer holds (100 records, 500
    headers, 100 sets) ends with a `resumptionToken` ("There are more
    results." on the page); the same request with `resumptionToken` and
    no other argument ("Resume") answers the next part, until the last,
    whose token is empty. A token lasts 24 hours; an unknown or expired
    one answers "The requested resumptionToken is invalid or has
    expired". On the last part, the page still reads "There are more
    results." with a "Resume" link that answers that error ⚠ [A4](#a4).
    <sup>k</sup> <sup>q15</sup>
14. **Refusals.** Every refusal is one line of the table "Errors"; the
    address stays reachable and the next request is answered as usual.
    <sup>m</sup>
15. **One record.** GetRecord answers the record of the identifier in
    the format asked for, a deleted one included. A journal's address
    answers "No matching identifier in this repository" for another
    journal's article and for an identifier of no published article; the
    site-wide address answers for any journal's. {OJS OMP} A journal's
    address also answers the first journal's deleted records (Rule 4b)
    [A1](#a1). <sup>e</sup> <sup>q8</sup> <sup>q16</sup>
16. **The site-wide address.** It answers as one repository for the
    whole site: "Repository Name" is the site's "Site Name"
    (Administration › Site Settings › "Settings"; empty on the test
    install, so the name is empty) and "Admin Email" the site's "Email
    of principal contact" (Site Settings › "Information"). It lists the
    records of every journal that is enabled publicly and, {OJS OPS},
    has "Enable OAI" on. ListSets names every journal enabled publicly,
    with its sections, whether its "Enable OAI" is on or not.
    <sup>e</sup> <sup>q17</sup>
    - 16a. An OAI address naming a journal the site does not have, such
      as `{site address}/index.php/nosuchjournal/oai`, answers "404 Not
      Found".
    - 16b. A journal unticked under "Enable this journal to appear
      publicly on the site" leaves the site-wide records: from that
      moment each of its published articles reads as a deleted record
      there, and ticked again, they are live again. <sup>n</sup>
      <sup>q17</sup>
17. **"Enable OAI"** {OJS OPS}. With "Disable" saved, the journal's
    published articles leave both addresses: GetRecord and
    ListMetadataFormats with their identifier answer "No matching
    identifier in this repository". Identify, ListSets and
    ListMetadataFormats answer as before. "Enable" saved again brings
    every record back with the same identifier. A press has no such
    choice ⚠ [OMP2](#omp2). <sup>o</sup> <sup>q18</sup>
    - 17a. The journal's deleted records stay: the site-wide address
      still lists them and, on a preprint server, the server's own
      address too. The journal's lists answer "No matching records in
      this repository" only when nothing deleted is left to show ({OJS}
      never while the first journal (Rule 4b) has deleted records,
      [A1](#a1)), and on a preprint server "Earliest Datestamp" becomes
      the oldest deleted record's. <sup>o</sup> <sup>q18</sup>
18. **A journal closed to visitors.** On a journal whose "Site Access
    Options" require visitors to register and log in, or that is not
    enabled publicly, a signed-out request to the journal's address is
    sent to the Login page. A signed-in browser is answered instead,
    whatever its role in the journal, even with none. On a journal not
    enabled publicly its lists then hold none of its own records: they
    answer "No matching records in this repository", or show the
    first journal's deleted records in their place (Rule 4b)
    [A1](#a1). Identify and ListSets name it. <sup>b</sup> <sup>q1</sup>
19. **Languages.** A record carries every language its item has (Rule
    11). The language the request is read in (the address's language
    segment, such as `…/fr_CA/oai`) decides "Repository Name", the set
    names and the type words ("Peer-reviewed Article" on a journal,
    "Book" on a press). Read in French, a book's "Resource Type" and an
    article's MARC 251 and 780 {OJS} carry untranslated keys ⚠
    [A13](#a13). A section whose "Abbreviation" differs in that
    language gets that language's set identifier ⚠ [A21](#a21).
    <sup>u</sup> <sup>q19</sup>
    - 19a. On a journal with more than one interface language, the
      plain address is first sent on to the one with a language in it:
      the language the same browser last asked for (the app remembers
      it), else `…/en/oai`. <sup>u</sup> <sup>q19</sup>
20. **Versions** {OJS}. While any journal of the install versions its
    DOIs, every OAI list and record request fails ⚠ [A22](#a22), so the
    records this rule and 20a describe have not been seen. A journal
    with DOIs enabled and "DOI Versioning" set to "Yes, assign a unique
    DOI to every version of an article." lists, beside the article's record, one record for each
    earlier published major version, identified as
    "oai:{repository identifier}:article/{ID}/version/{stage}/{number}",
    `{stage}` "VoR" (Version of Record), "AO" (Author Original) or
    "PMUR" (Published Manuscript Under Review); the latest minor version
    of that major stands for it. The current version keeps the plain
    identifier. <sup>r</sup> <sup>q20</sup>
    - 20a. Unpublishing an earlier version makes its own identifier a
      deleted record; unpublishing the current version gives the plain
      identifier back to the version before it, and that version's own
      identifier becomes a deleted record [A22](#a22). <sup>r</sup>
      <sup>q20</sup>
    - 20b. Without versioning, only the current version has a record.
      Once a later major version is published, its record names the
      version before it in "Relation" (and MARC 780), minor versions
      included: by that version's DOI when versioning gave it one of its
      own [A22](#a22), else by its address. <sup>r</sup> <sup>q20</sup>
21. **The JATS format** {OJS}. `jats` is offered only while "JATS
    Metadata Format" is enabled in the journal. <sup>h</sup>
    <sup>q5</sup>
    - 21a. An article in an issue that requires a subscription is
      refused, even when the article itself is marked "Open Access"
      (which "DRIVER" counts as open, Rule 23), with "Cannot disseminate
      format (unauthenticated access to JATS XML not allowed)"; the
      refusal replaces the whole answer, so a ListRecords holding one
      such article lists nothing ⚠ [A10](#a10), while ListIdentifiers
      lists it like any other. An issue past its open access date no
      longer requires a subscription, and its articles are served. A
      signed-in Journal Manager or Section Editor is served (Actors).
    - 21b. With the "JATS Template Plugin" disabled, every `jats` request
      answers "Cannot disseminate format (JATS XML not available)",
      while ListMetadataFormats still offers `jats`.
22. **"Ignore uploaded JATS XML documents"** {OJS}. Unticked, a `jats`
    record takes the body and back matter from the article's XML galley
    when it has one. Ticked, the record is the generated document: no
    back matter, and a body that is the XML galley's whole text, journal
    title, authors and references included, run together in one
    paragraph, as [JATS & Body Text](U48-jats-and-body-text.md#generated)
    builds a body from a galley's text (its entry
    [A7](U48-jats-and-body-text.md#a7)). <sup>h</sup> <sup>q5</sup>
23. **"DRIVER"** {OJS}. With the plugin enabled, ListSets adds the set
    `driver`, named "Open Access DRIVERset". A record belongs to it, its
    header naming "driver" too, when anyone may read the article: the
    journal is open access, or, on a journal that sells subscriptions,
    its issue is open access (an issue whose open access date has passed
    does not count) or the article is marked "Open Access"; and neither
    "Site Access Options" box requires signing in. The set is meant for
    articles with a galley, but one without a galley belongs to it too ⚠
    [A23](#a23). <sup>i</sup> <sup>q21</sup>
    - 23a. `set=driver` lists those records only, and says "There are
      more results." even when it is complete ⚠ [A24](#a24). The
      members' deleted records are marked for the set but never listed: the
      journal's address leaves out its own deleted records [A1](#a1),
      and the site-wide address has no `driver` set. An article in no
      issue unpublished while the plugin is enabled loses its `driver`
      mark ⚠ [A11](#a11). <sup>i</sup> <sup>q21</sup>
24. **The install's own switch.** With the install's OAI interface
    switched off in its configuration file, a journal's and the site's
    address lead to the journal's (site's) home page {OJS OPS}; on a
    press they lead to the Login page, or signed in to the page "The
    current role does not have access to this operation.". No screen
    changes it; Administration › "System Information" shows it (Settings
    bullet 14). <sup>t</sup>

## Side effects

- Saving the "Access" tab shows "Saved"; saving the "JATS Metadata
  Format" window shows "Your changes have been saved.". Harvesting
  requests change nothing a user sees, and no email, notification or
  log entry comes from the feature. <sup>o</sup> <sup>h</sup>
- Deleted records are made by other features' actions (Rules 4, 16b):
  unpublishing (*[Publish, schedule &
  versions](U49-publish-schedule-and-versions.md)*); {OJS} unpublishing
  or deleting an issue (*[Issues](U50-issues.md)*); a journal no longer
  enabled publicly, and a journal removed under Administration › Hosted
  Journals (*Hosted journals*), though a removed preprint server leaves
  none ⚠ [OPS4](#ops4); and {OMP} a format made unavailable (Rule 4a).
  <sup>n</sup>

## Settings that modify behavior

1. **"Enable OAI"** {OJS OPS} (Settings › Distribution › "Access";
   default "Enable"). "Enable": the journal's records are listed (Rules
   3–16). "Disable": their live records are withheld from both
   addresses (Rule 17). <sup>o</sup>
2. **"JATS Metadata Format"** {OJS} (Settings › Website › "Plugins" ›
   "Installed Plugins" › "OAI Metadata Format Plugins"; default
   disabled). Enabled: the `jats` format and the row's "Settings"
   (Rules 10, 21). Disabled: `jats` is not offered. *Plugins management*
   owns enabling and disabling. <sup>p</sup>
3. **"Ignore uploaded JATS XML documents"** {OJS} (the plugin's
   "Settings" window; default unticked). Ticked: the XML galley's
   structure is not used (Rule 22). <sup>h</sup>
4. **"JATS Template Plugin"** {OJS} (Settings › Website › "Plugins",
   "Generic Plugins"; default enabled). Disabled: every `jats` request is
   refused (Rule 21b). [JATS & Body Text](U48-jats-and-body-text.md)
   owns the plugin. <sup>h</sup>
5. **"DRIVER"** {OJS} (Settings › Website › "Plugins", "Generic
   Plugins"; default disabled). Enabled: the `driver` set (Rule 23).
   <sup>i</sup>
6. **"DOIs" and "DOI Versioning"** {OJS} (Settings › Distribution ›
   "DOIs": "Allow Digital Object Identifiers (DOIs) to be assigned to
   work published in this journal." and "DOI Versioning"; default on,
   "Articles" ticked, no "DOI Prefix", and "No, all versions of an
   article should have the same DOI."). DOIs on and a "DOI Prefix"
   given: the article's DOI in "Resource Identifier" and in `marcxml`
   024 (not `oai_marc`). Both on: a record per earlier version, and the
   previous version named by its DOI in "Relation" (Rules 20, 20b)
   [A22](#a22). *DOIs* owns the tab. <sup>r</sup>
7. **"Publishing Mode"** {OJS} (Settings › Distribution › "Access";
   a new journal has none chosen, which reads as open access).
   "…require subscriptions…": `jats` refuses articles in subscription
   issues (Rule 21a) and "DRIVER" leaves out articles closed to
   non-subscribers (Rule 23). "OJS will not be used to publish the
   journal's contents online.": Rule 11a.
   [Subscriptions & open access control](U51-subscriptions.md) owns the
   field. <sup>f</sup>
8. **"Users must be registered and log in to view the journal site."**
   ("…the press site.", "…the server site."; Settings › Users & Roles ›
   "Site Access Options"; default unticked). Ticked: Rule 18, and
   "DRIVER" leaves the journal's records out (Rule 23).
   [Roles configuration](U54-roles-configuration.md) owns the option.
   <sup>b</sup>
9. **"Users must be registered and log in to view open access
   content."** (the same tab, under "View Article Content"; "View
   Monograph Content" on a press, "View Preprint Content" on a preprint
   server; default unticked). Ticked: {OJS} "DRIVER" leaves the
   journal's records out (Rule 23). [Roles
   configuration](U54-roles-configuration.md) owns the option.
   <sup>i</sup>
10. **"Enable this journal to appear publicly on the site"**
    ("…this press…", "…this preprint server…"; Administration › Hosted
    Journals, "Create Journal" or the journal's "Edit"; unticked in the
    "Create Journal" window, so a new journal is not public until it is
    ticked). Unticked: Rules 16b and 18. *Hosted journals* owns it.
    <sup>b</sup> <sup>n</sup>
11. **A section's "Abbreviation" and "Identify items published in this
    section as a(n)"** (Settings › Journal › "Sections"; OPS: "Identify
    items posted in this section as a(n)"). The abbreviation names the
    section's set (Rule 7), in each language its own [A21](#a21); the
    words, when filled, are the records' type {OJS} (the Dublin Core and
    MARC tables).
    [Sections](U17-sections.md) owns the fields. <sup>j</sup>
12. **The journal's own texts**: its name, "Publisher" {OJS} ("Press
    Publisher Name" on a press), the ISSNs {OJS} and the Principal
    Contact's email (Settings › Journal). Each fills its part of Identify
    and of the records (the Identify, Dublin Core and MARC tables).
    [Journal identity & about pages](U07-journal-identity-and-about-pages.md)
    owns them. <sup>d</sup>
13. **"Pages" and "Article Number"** {OJS} (the version's "Publication
    Settings" and "Metadata" pages; "Article Number" offered while the
    journal enables it on Settings › Workflow › Submission ›
    "Metadata"). "Pages" fill the Dublin Core "Source" and MARC 773;
    without them, the "Article Number" does. <sup>f</sup> <sup>g</sup>
14. **The install's configuration file** (its OAI section; shown
    read-only on Administration › "System Information" as the group
    "oai", with "oai", "repository_id" and "oai_max_records", and
    changed on no screen). The interface on or off (Rule 24), the
    repository identifier (Identify; typed once in the installer's "OAI
    Settings" › "Repository Identifier") and the records per answer (100
    by default, Rule 13). <sup>t</sup>

## Cross-feature interactions

- [Publish, schedule & versions](U49-publish-schedule-and-versions.md)
  owns publishing, scheduling, unpublishing and versions, which make,
  delete and restore records (Rules 3, 4, 20); this spec owns what the
  records say.
- [Issues](U50-issues.md) owns issues, their publishing, unpublishing
  and deleting, which put an article's issue in its records and turn
  them into deleted records (Rules 3, 4).
- [Sections](U17-sections.md) owns the sections, their abbreviation and
  type (Rule 7; Settings bullet 11) and carries the entry for a preprint
  without an abstract ([OPS2](#ops2)).
- [Publication metadata](U40-publication-metadata.md),
  [Contributors & affiliations](U41-contributors-and-affiliations.md),
  [Identifiers](U44-identifiers.md) and *DOIs* own the values the records
  carry; [Galleys](U46-galleys.md) owns the galleys named in "Format",
  "Language" and "Relation".
- [JATS & Body Text](U48-jats-and-body-text.md) owns the generated JATS
  document the `jats` format hands out, and the "JATS Template Plugin".
- [Subscriptions & open access control](U51-subscriptions.md) owns the
  "Access" tab's other fields; [Roles
  configuration](U54-roles-configuration.md) and *Hosted journals* own the
  access settings of Rule 18.
- [Journal identity & about pages](U07-journal-identity-and-about-pages.md)
  owns who opens the Settings pages and the journal's texts.
- *Plugins management* owns the "Installed Plugins" list and enabling
  and disabling a plugin (Actors rows 4–5).
- [Web feeds](U18-web-feeds.md) is the other machine-read way to follow
  a journal; nothing is shared but the published articles.
- *Search-engine metadata & analytics* owns the Dublin Core tags in the
  article page's own header {OJS OMP}, which are not these records.
- *Languages & locales* owns the interface languages a request can be
  read in (Rule 19).

## Canonical scenarios

Every scenario runs on a scratch journal, press or preprint server with
throwaway accounts, its OAI address read by a visitor, signed out, in a
second browser; scenario 6's Site Administrator is the install's ready
account. The accounts, their passwords and the tooling recipe are in the
footnote. <sup>s</sup>

1. **A harvester reads a journal's address** {OJS OMP OPS}

   Given: a visitor, signed out, on a scratch journal "Sea Letters" with
   one language, whose principal contact's email is
   "pat.contact@example.org" and whose section is "Articles",
   abbreviation "ART" ("Preprints", "PRE" on a preprint server; a press
   has no series), where the Author Ada Author's article "Tidal
   Patterns", with the abstract "Tides follow the moon." and {OJS OPS}
   the keywords "tides" and "moon", is published today with a PDF galley
   (on a press with two available formats, "PDF", holding a PDF file,
   and "EPUB", beside her book "Bare Book", published with no format),
   her "Draft Study" is submitted and still in the workflow and, on a
   journal, her "Future Tides" is scheduled in the unpublished issue Vol.
   1 No. 2 (2026); and a second scratch journal where the article
   "Elsewhere" is published.

   - **Identify**: open {journal address}/oai?verb=Identify,
     {journal address} being the address of the journal's home page: a
     page titled "OAI 2.0 Request Results" shows "Request was of type
     Identify." and a table where "Repository Name" reads "Sea Letters",
     "Base URL" "{journal address}/oai", "Protocol Version" "2.0",
     "Deleted Record Policy" "persistent", "Granularity"
     "YYYY-MM-DDThh:mm:ssZ" and "Admin Email" "pat.contact@example.org";
     under "OAI-Identifier", "Scheme" reads "oai", "Delimiter" ":" and
     "Sample OAI Identifier" "oai:{repository identifier}:article/1"
     ("…:publicationFormat/1" on a press, "…:preprint/1" on a preprint
     server), `{repository identifier}` being the "Repository
     Identifier" shown there; the block "Unsupported Description Type"
     names "Open Journal Systems" ("Open Monograph Press", "Open Preprint
     Systems") (Fields, "Identify").
   - **ListSets**: press the link "ListSets" at the top of the page: one
     block "Set" has the "setName" "Sea Letters" and the "setSpec" of the
     journal's path, and on a journal and a preprint server a second has
     the "setName" "Articles" ("Preprints") and the "setSpec" "{journal
     path}:ART" ("…:PRE"); a press lists itself alone (Rule 7).
   - **ListMetadataFormats**: press "ListMetadataFormats": on a journal
     three blocks "Metadata Format" show, with the "metadataPrefix"
     "oai_dc", "oai_marc" and "marcxml"; on a press and a preprint server
     one, "oai_dc" (Rule 10; the table "The formats").
   - **ListRecords**: press "ListRecords": the page lists the record of
     "Tidal Patterns" under "OAI Record:" and its identifier,
     "oai:{repository identifier}:article/{ID}", `{ID}` being the number
     the Dashboard lists the article under ("…:preprint/{ID}" on a
     preprint server); its "OAI Record Header" has a "setSpec" row
     "{journal path}:ART" ("…:PRE"; on a press, the press's path). On a
     journal and a press the list may also hold the first journal's
     deleted records [A1](#a1) (Rules 3, 4b, 7d; the table "A record's
     header").
   - **A press's records** {OMP}: the list holds two records for "Tidal
     Patterns", one per format, each identified as
     "oai:{repository identifier}:publicationFormat/" and a number, and
     none for "Bare Book" (Rule 3a) [OMP1](#omp1).
   - **Not listed**: the list holds no record of "Draft Study", of
     "Future Tides" {OJS} or of "Elsewhere" (Rule 3).
   - **GetRecord**: press the link "oai_dc" in the header of "Tidal
     Patterns" (on a press, in either of its two headers): the page shows "OAI
     Record: {identifier}" and "Dublin Core Metadata (oai_dc)", where
     "Title" reads "Tidal Patterns", "Author or Creator" "Author, Ada",
     "Description" "Tides follow the moon.", "Date" today's date written
     YYYY-MM-DD, and {OJS OPS} "Subject and Keywords" "tides" and "moon"
     and "Publisher" "Sea Letters"; "Resource Type" reads
     "info:eu-repo/semantics/article" and
     "info:eu-repo/semantics/publishedVersion" ("Book" on a press;
     "info:eu-repo/semantics/preprint" and "info:eu-repo/semantics/draft"
     on a preprint server [OPS3](#ops3)); "Format" "application/pdf"
     ("Digital (on physical carrier) (DA)" on a press); "Resource
     Identifier" the article page's address (the book page's, the
     preprint page's); "Language" "en" ("eng" on a press); and {OJS
     OPS} "Relation" the galley's address (Rule 11; the table "The
     Dublin Core record").
   - **The browser view**: each of these pages carries the links
     "Identify", "ListRecords", "ListSets", "ListMetadataFormats" and
     "ListIdentifiers" at its top and again at its bottom, with "About
     the XSLT", and a table where "Request URL" reads
     "{journal address}/oai". Back on the ListSets page, press "Records"
     in the block of "Articles" ("Preprints"; on a press, of the press):
     the page lists "Tidal Patterns" (Fields, "The browser view").
   - **Control**: the second journal's ListRecords, at its own address
     ({its journal address}/oai?verb=ListRecords&metadataPrefix=oai_dc),
     lists "Elsewhere" (Rule 3). <sup>s</sup>

2. **The site-wide address answers for every journal** {OJS OMP OPS}

   Given: a visitor, signed out, in a browser that has not opened an OAI
   address in another language, on a site with more than one language
   and an empty "Site Name", with two scratch journals: "Sea Letters",
   where the article "Tidal Patterns" is published, and "Hill Notes",
   where the article "Mountain Air" is published.

   - **Identify**: open {site address}/index.php/index/oai?verb=Identify,
     {site address} being the install's own address: the browser lands
     on {site address}/index.php/index/en/oai, and "Base URL" and
     "Request URL" read that address (Rule 19a). "Repository Name" is
     empty, and "Admin Email" reads the address Administration › Site
     Settings › "Information" shows in "Email of principal contact"
     (Rule 16).
   - **Each journal's record**: at each journal's own address, press
     "ListRecords" and note the "OAI Identifier" of its article. At the
     site-wide address, open
     `…/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=` followed by
     the identifier of "Tidal Patterns": its Dublin Core record shows,
     "Title" "Tidal Patterns"; the same with the identifier of "Mountain
     Air" shows "Mountain Air" (Rules 15, 16).
   - **One journal's set**: at the site-wide address, open
     `…/oai?verb=ListRecords&metadataPrefix=oai_dc&set=` followed by the
     path of "Sea Letters": it lists "Tidal Patterns" and not "Mountain
     Air"; with the path of "Hill Notes" it lists "Mountain Air" and not
     "Tidal Patterns" (Rules 8, 16).
   - **Not across journals**: at the address of "Sea Letters", GetRecord
     with the identifier of "Mountain Air" answers "OAI Error(s)", the
     "Error Code" "idDoesNotExist" and "No matching identifier in this
     repository" (Rule 15).
   - **Control**: the same GetRecord at the address of "Hill Notes"
     shows the record of "Mountain Air" (Rule 15). <sup>s</sup>

3. **Records follow publishing** {OJS OMP OPS}

   Given: Journal Manager, and a visitor, signed out, in a second
   browser, on a scratch journal where the article "Tidal Patterns" and
   then the article "Coral Reefs" were published (on a press each with
   one available format, "PDF").

   - **Before**: the visitor opens
     {journal address}/oai?verb=ListRecords&metadataPrefix=oai_dc
     ({journal address} being the address of the journal's home page):
     it lists "Tidal Patterns", then "Coral Reefs" (Rules 4b, 6; on a
     journal and a press, beside the first journal's deleted records,
     [A1](#a1)). Note the "OAI Identifier" of "Tidal Patterns".
   - **Unpublished**: Journal Manager: open "Tidal Patterns" in its
     workflow and unpublish it, as [Publish, schedule &
     versions](U49-publish-schedule-and-versions.md) scenario 3 does. The
     visitor opens, at the site-wide address,
     {site address}/index.php/index/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=
     followed by that identifier: the "OAI Record Header" shows the same
     "OAI Identifier", a "Datestamp" of today and the same "setSpec",
     with "This record has been deleted." under it and no "Dublin Core
     Metadata (oai_dc)" (Rules 4, 4a).
   - **The journal's own address**: the visitor reloads the journal's
     ListRecords: "Coral Reefs" is listed and "Tidal Patterns" is not
     live; a preprint server lists its deleted record, while on a journal
     and a press it is missing and the journal's GetRecord with its
     identifier answers "No matching identifier in this repository"
     [A1](#a1) (Rule 4b).
   - **Published again**: Journal Manager: publish "Tidal Patterns"
     again, as that spec's scenario 10 does. The visitor reloads the
     site-wide GetRecord: the Dublin Core record of "Tidal Patterns" shows
     again under the same "OAI Identifier", without "This record has been
     deleted."; the journal's ListRecords lists "Tidal Patterns" and
     "Coral Reefs" (Rule 4).
   - **Control**: throughout, the site-wide GetRecord of "Coral Reefs"
     shows its Dublin Core record (Rule 3). <sup>s</sup>

4. **Refused requests** {OJS OMP OPS}

   Given: a visitor, signed out, on a scratch journal "Sea Letters" where
   the article "Tidal Patterns" is published; and {OPS} a second
   scratch preprint server, "Empty Shelf", with nothing published.

   Each refusal below shows "OAI Error(s)", "The request could not be
   completed due to the following error or errors.", the "Error Code"
   and the message quoted (the table "Errors").

   - **No request name**: open {journal address}/oai ({journal address}
     being the address of the journal's home page): "badVerb", "Illegal
     OAI verb"; the same with `?verb=identify` (Rule 2).
   - **A missing argument**: open `…/oai?verb=ListRecords`:
     "badArgument", "Missing metadataPrefix parameter" (Rule 2).
   - **An argument the request does not take**: open
     `…/oai?verb=ListSets&metadataPrefix=oai_dc`: "badArgument",
     "metadataPrefix is an illegal parameter" (Rule 2).
   - **A format not offered**: open
     `…/oai?verb=ListRecords&metadataPrefix=jats` (`metadataPrefix=marcxml`
     on a press and a preprint server): "cannotDisseminateFormat", "The
     requested metadataPrefix is not supported by this repository" (Rule
     10).
   - **Identifiers**: open
     `…/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=foo`:
     "badArgument", "Identifier is not in a valid format". Then give the
     "OAI Identifier" of "Tidal Patterns" with its closing number
     replaced by 0: "idDoesNotExist", "No matching identifier in this
     repository" (Rule 15).
   - **A paging token**: open `…/oai?verb=ListRecords&resumptionToken=abc`:
     "badResumptionToken", "The requested resumptionToken is invalid or
     has expired"; with `&metadataPrefix=oai_dc` added: "badArgument",
     "metadataPrefix is an illegal parameter" (Rule 13).
   - **Nothing to list** {OPS}: at the address of "Empty Shelf",
     `…/oai?verb=ListRecords&metadataPrefix=oai_dc` answers
     "noRecordsMatch", "No matching records in this repository"; its
     Identify's "Earliest Datestamp" reads the moment of the request
     (Rule 3; Fields, "Identify"). An empty journal or press is not read
     here: it lists any deleted records of the first journal, and
     its "Earliest Datestamp" is the oldest of theirs [A1](#a1) (Rule 4b).
   - **Control**: after the refusals,
     {journal address}/oai?verb=Identify still shows "Request was of type
     Identify." and "Repository Name" "Sea Letters" (Rule 14).
     <sup>s</sup>

5. **Asking by set and by date** {OJS OMP OPS}

   Given: a visitor, signed out, on a scratch journal whose sections are
   "Articles", abbreviation "ART", and "Reviews", abbreviation "REV",
   where the article "Tidal Patterns", in "Articles", and then the
   article "Hill Review", in "Reviews", were published today (on a
   press, two books in no series).

   - **The journal's set**: open
     {journal address}/oai?verb=ListRecords&metadataPrefix=oai_dc&set=
     followed by the journal's path ({journal address} being the address
     of the journal's home page): it lists "Tidal Patterns", then "Hill
     Review", and each header's "Datestamp" reads today's date (Rules
     4b, 5, 6, 8).
   - **A section's set** {OJS OPS}: with `set={journal path}:ART` it
     lists "Tidal Patterns" alone; with `set={journal path}:REV`, "Hill
     Review" alone (Rule 8).
   - **A set the journal does not have** {OJS OPS}: with `set=nosuchset`
     it answers "noRecordsMatch", "No matching records in this
     repository" (Rules 4b, 8). A press is not read here [OMP3](#omp3).
   - **`from`**: with the journal's set and `&from=` today's date
     written YYYY-MM-DD it lists both; with tomorrow's date it answers
     "No matching records in this repository" (Rules 4b, 9).
   - **`until`** {OJS OMP}: with the journal's set and `&until=` today's
     date it lists both; with yesterday's date, "No matching records in
     this repository" (Rules 4b, 9). A preprint server is not read here
     [OPS1](#ops1).
   - **Dates written wrong**: `from=26-09-2026` answers "badArgument",
     "Illegal from parameter". {OJS OMP}: `until=2026/09/26` answers
     "Illegal until parameter"; `from=2026-09-27&until=2026-09-26`
     answers "until parameter must be greater than or equal to from
     parameter"; `from=2026-09-26&until=2026-09-26T23:59:59Z` answers
     "until and from parameters must be of the same granularity" (Rule
     9; the table "Errors").
   - **Control**: with the journal's set and `from=2000-01-01` it lists
     both, so only the way the dates were written was refused (Rule 9).
     <sup>s</sup>

6. **A journal closed to visitors, or taken off the site** {OJS OMP OPS}

   Given: Site Administrator, and a visitor, signed out, in a second
   browser, on a scratch journal "Sea Letters" where the article "Tidal
   Patterns" is published; and a second scratch journal, "Hill Notes",
   where "Users must be registered and log in to view the journal site."
   ("…the press site.", "…the server site.") is ticked on Settings ›
   Users & Roles › "Site Access Options" and the article "Mountain Air"
   is published.

   - **Sign-in required**: the visitor opens {address of Hill
     Notes}/oai?verb=Identify ({address of Hill Notes} being the address
     of its home page): the Login page opens in place of the answer; the
     same with `?verb=ListRecords&metadataPrefix=oai_dc` (Rule 18;
     Settings bullet 8).
   - **Before**: the visitor opens {address of Sea
     Letters}/oai?verb=ListRecords&metadataPrefix=oai_dc and notes the
     "OAI Identifier" of "Tidal Patterns"; at the site-wide address,
     {site address}/index.php/index/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=
     followed by that identifier shows its Dublin Core record.
   - **Taken off the site**: Site Administrator: open Administration ›
     Hosted Journals (Hosted Presses, Hosted Servers), open the "Edit"
     window of "Sea Letters", untick "Enable this journal to appear
     publicly on the site" ("…this press…", "…this preprint server…")
     and save. The visitor opens {address of Sea
     Letters}/oai?verb=Identify: the Login page opens in place of the
     answer (Rule 18; Settings bullet 10). The site-wide GetRecord of
     "Tidal Patterns" now shows "This record has been deleted." under
     the same "OAI Identifier" (Rule 16b).
   - **Back on the site**: tick the box again and save. The site-wide
     GetRecord shows the Dublin Core record of "Tidal Patterns" again,
     under the same "OAI Identifier", and {address of Sea
     Letters}/oai?verb=Identify shows "Repository Name" "Sea Letters"
     (Rule 16b).
   - **Control**: before the untick, {address of Sea
     Letters}/oai?verb=Identify showed "Repository Name" "Sea Letters"
     (Rule 18). <sup>s</sup>

7. **"Enable OAI" withholds a journal's records** {OJS OPS}

   Given: Journal Manager, and a visitor, signed out, in a second
   browser, on a scratch journal "Sea Letters" where the articles "Tidal
   Patterns" and "Coral Reefs" are published.

   - **The field**: Journal Manager: open Settings › Distribution ›
     "Access": after "Publishing Mode" ("Posting Mode" on a preprint
     server) stands "Enable OAI", with "Provide metadata to third-party
     indexing services through the Open Archives Initiative." under it
     and "Enable" chosen (Fields, "Enable OAI").
   - **A deleted record first**: the visitor opens
     {journal address}/oai?verb=ListRecords&metadataPrefix=oai_dc
     ({journal address} being the address of the journal's home page)
     and notes the "OAI Identifier" of each article. Journal Manager:
     unpublish "Coral Reefs", as [Publish, schedule &
     versions](U49-publish-schedule-and-versions.md) scenario 3 does.
   - **"Disable"**: Journal Manager: choose "Disable" and press "Save":
     "Saved" shows. The visitor opens
     `…/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=` followed
     by the identifier of "Tidal Patterns", at the journal's address and
     at the site-wide address, {site address}/index.php/index/oai: both
     answer "No matching identifier in this repository"; so does the
     journal's `…/oai?verb=ListMetadataFormats&identifier=` with it. The
     journal's Identify still shows "Repository Name" "Sea Letters", and
     its ListSets still names "Sea Letters" (Rule 17; Settings bullet 1).
   - **Deleted records stay**: the site-wide GetRecord of "Coral Reefs"
     shows "This record has been deleted." under its "OAI Identifier";
     on a preprint server the server's own ListRecords lists that deleted
     record, and its Identify's "Earliest Datestamp" reads that record's
     "Datestamp" (Rule 17a).
   - **"Enable" again**: Journal Manager: choose "Enable" and press
     "Save": "Saved" shows. The visitor reloads the journal's GetRecord of
     "Tidal Patterns": its Dublin Core record shows under the same "OAI
     Identifier" (Rule 17).
   - **Control**: before "Disable", the journal's GetRecord of "Tidal
     Patterns" showed its Dublin Core record (Rule 17). <sup>s</sup>

   A press has no "Enable OAI" [OMP2](#omp2), so it has no analogue.

8. **A journal's MARC records** {OJS}

   Given: a visitor, signed out, on a scratch journal "Sea Letters" whose
   section "Articles" has "Research Article" in "Identify items published
   in this section as a(n)", where the Author Ada Author's article "Tidal
   Patterns", with the subtitle "A Study", the abstract "Tides follow the
   moon.", the discipline "Marine Science", the subject "Oceanography"
   and the "Article Number" "e0142", is published with a PDF galley in
   the published issue Vol. 1 No. 2 (2026), and her article "Loose
   Notes" is published in no issue.

   - **The formats**: open
     {journal address}/oai?verb=ListMetadataFormats ({journal address}
     being the address of the journal's home page): the "metadataPrefix"
     "oai_marc" and "marcxml" are listed beside "oai_dc" (Rule 10).
   - **`marcxml`**: open
     `…/oai?verb=GetRecord&metadataPrefix=marcxml&identifier=` followed
     by the "OAI Identifier" of "Tidal Patterns", as ListRecords shows
     it: the page shows "Unknown Metadata Format" and the record's XML as
     text. By field number: 042 "dc"; 100 "Author, Ada"; 245 "Tidal
     Patterns", without "A Study"; 251 "Version of Record 1.0"; 260 "Sea
     Letters", then the issue's publication date; 520 "Tides follow the
     moon."; 546 "eng"; 653 "Marine Science", then "Oceanography"; 655
     "Research Article"; 773 "Sea Letters;" then "Vol. 1 No. 2 (2026),
     e0142"; 856 "application/pdf" and the article page's address (Rule
     12; the table "The MARC records"). Field 008 is not read
     [A15](#a15).
   - **`oai_marc`**: the same request with `metadataPrefix=oai_marc`
     carries the same fields with the same values (the table "The MARC
     records").
   - **In no issue**: the `marcxml` record of "Loose Notes" has no issue
     part in 773 and no date in 260 (Rule 12).
   - **Its Dublin Core record**: the same request with
     `metadataPrefix=oai_dc`: "Title" reads "Tidal Patterns: A Study";
     "Subject and Keywords" "Oceanography"; "Resource Type"
     "info:eu-repo/semantics/article", "Research Article" and
     "info:eu-repo/semantics/publishedVersion"; "Source" "Sea Letters;
     Vol. 1 No. 2 (2026); e0142" (the table "The Dublin Core record";
     Settings bullets 11, 13).
   - **Control**: neither record names a discipline or subject "Array"
     (Rules 11, 12). <sup>s</sup>

9. **The JATS format and its window** {OJS}

   Given: Journal Manager, and a visitor, signed out, in a second
   browser, on a scratch journal "Sea Letters" whose "JATS Metadata
   Format" nobody has touched, where the Author Ada Author's article
   "Tidal Patterns" is published in no issue with a PDF galley, and her
   article "Marked Tides" is published in no issue with an XML galley.

   - **The plugin rows**: Journal Manager: open Settings › Website ›
     "Plugins" › "Installed Plugins": under "OAI Metadata Format
     Plugins", "DC Metadata Format", "MARC Metadata Format" and "MARC21
     Metadata Format" are ticked and their boxes cannot be pressed;
     "JATS Metadata Format" is unticked (Actors row 4; the table "The
     formats").
   - **Enabled**: tick "JATS Metadata Format". The visitor opens
     {journal address}/oai?verb=ListMetadataFormats ({journal address}
     being the address of the journal's home page): "jats" is listed
     beside "oai_dc", "oai_marc" and "marcxml". Then
     `…/oai?verb=GetRecord&metadataPrefix=jats&identifier=` followed by
     the "OAI Identifier" of "Tidal Patterns": "Unknown Metadata Format"
     and a JATS document as text, carrying the title "Tidal Patterns",
     this year as its collection year, the language "en", and no email
     address of Ada Author (Rule 21; the JATS record).
   - **An XML galley**: the same request for "Marked Tides": the
     document's body and back matter are those of its XML galley (Rule
     22).
   - **The window**: Journal Manager: press the arrow beside "JATS
     Metadata Format", then "Settings": a window titled "JATS Metadata
     Format" opens with "This plugin provides metadata to external
     services in the JATS XML format via the OAI-PMH interface. When used
     in conjunction with the JATS Template plugin, it can function even if
     JATS XML documents have not been uploaded into OJS.", a heading
     "Settings" with "Ignore uploaded JATS XML documents" unticked, and
     "Cancel" and "OK". Tick the box and press "OK": the window closes
     and "Your changes have been saved." shows (Fields; Side effects).
   - **Uploaded XML ignored**: the visitor reloads the `jats` record of
     "Marked Tides": its body is the XML galley's whole text run together
     in one paragraph, and it has no back matter (Rule 22; Settings
     bullet 3).
   - **The template switched off**: Journal Manager: on "Installed
     Plugins", untick "JATS Template Plugin" under "Generic Plugins" and
     confirm. The visitor reloads the `jats` record of "Tidal Patterns":
     "cannotDisseminateFormat", "Cannot disseminate format (JATS XML not
     available)"; ListMetadataFormats still lists "jats" (Rule 21b;
     Settings bullet 4).
   - **Control**: before "JATS Metadata Format" was ticked,
     ListMetadataFormats listed no "jats", and the `jats` GetRecord of
     "Tidal Patterns" answered "The requested metadataPrefix is not
     supported by this repository" (Rules 10, 21). <sup>s</sup>

10. **A journal that sells subscriptions, and one that does not publish online** {OJS}

    Given: a visitor, signed out, on a scratch journal "Paid Letters"
    set to "The journal will require subscriptions to access some or all
    of its contents.", with "JATS Metadata Format" and "DRIVER" enabled,
    where the article "Open Tides" is published in the issue Vol. 1 No.
    1 (2026), published as "Open access", and the articles "Closed
    Tides" and "Opened Tides" in the issue Vol. 1 No. 2 (2026), published
    as "Subscription", "Opened Tides" marked "Open Access", each with a
    PDF galley; and a second scratch journal, "Print Letters", set to
    "OJS will not be used to publish the journal's contents online.",
    where the article "Paper Tides" is published with a PDF galley.

    - **The `driver` set**: open
      {address of Paid Letters}/oai?verb=ListSets ({address of Paid
      Letters} being the address of its home page): a block "Set" has
      the "setSpec" "driver" and the "setName" "Open Access DRIVERset"
      (Rule 23; Settings bullet 5).
    - **Its members**: open
      `…/oai?verb=ListRecords&metadataPrefix=oai_dc&set=driver`: it
      lists "Open Tides" and "Opened Tides", each header with a "setSpec"
      row "driver", and not "Closed Tides" (Rule 23; Settings bullet 7).
      The page also says "There are more results." [A24](#a24); its
      "Resume" is not followed.
    - **Refused in `jats`**: open
      `…/oai?verb=GetRecord&metadataPrefix=jats&identifier=` followed by
      the "OAI Identifier" of "Closed Tides": "cannotDisseminateFormat",
      "Cannot disseminate format (unauthenticated access to JATS XML not
      allowed)"; the same for "Opened Tides". `…/oai?verb=ListIdentifiers&metadataPrefix=jats`
      lists the identifier of "Closed Tides" like the others (Rule 21a).
    - **Served in `jats`**: the `jats` GetRecord of "Open Tides" shows
      "Unknown Metadata Format" and its JATS document, titled "Open
      Tides" (Rule 21a).
    - **Not published online**: at the address of "Print Letters", the
      `oai_dc` GetRecord of "Paper Tides" shows its Dublin Core record
      [A9](#a9), "Title" "Paper Tides", and neither "Resource Identifier"
      nor "Relation" carries the article page's or the galley's address
      (Rule 11a; Settings bullet 7).
    - **Control**: the `oai_dc` GetRecord of "Closed Tides" shows its
      Dublin Core record, "Title" "Closed Tides" (Rules 3, 21a).
      <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for A13 (issue reports
    `docs/issues/U13-A1-french-version-name-raw-key.md` and
    `docs/issues/U69-A15-omp-french-book-page-raw-keys.md`): records read
    at `…/fr_CA/oai` carrying French words in a book's "Resource Type"
    and in an article's MARC field 251, no "##…##" key {OJS OMP} (Rule
    19; once fixed)
  - the guard for OPS1 (issue report
    `docs/issues/U19-OPS1-preprint-server-oai-until-fails.md`):
    ListIdentifiers and ListRecords asked with `until` on a preprint server
    list its preprints, as scenario 5 shows on a journal and a press {OPS}
    (Rule 9)
  - the guard for OMP4 (issue report
    `docs/issues/U19-OMP4-book-without-abstract-oai-lists-fail.md`): a
    press's ListRecords and GetRecord with one published book that has no
    abstract, the book's record answered without a "Description" {OMP} (once
    fixed)
  - the guard for A1 (issue report
    `docs/issues/U19-A1-oai-own-address-loses-deleted-records.md`): a second
    journal's own address after it unpublishes an article: its lists and
    GetRecord show its own deleted record and none of the first journal's,
    and the site-wide `set` of that journal lists it {OJS OMP} (Rule 4b;
    once fixed)
  - the guard for A18 (issue report
    `docs/issues/U19-A18-oai-datestamp-stays-after-edit-republish.md`): a
    published book (preprint) edited, then unpublished and published again:
    the record's datestamp moves each time and `from` today lists it {OMP
    OPS} (once fixed)
  - the guard for A22 (issue report
    `docs/issues/U19-A22-doi-versioning-oai-requests-fail.md`): with "DOI
    Versioning" at "Yes" on one journal (a "DOI Prefix" typed first),
    Identify, the lists and GetRecord answering at that journal, at another
    journal and at the site-wide address {OJS} (once fixed)
  - the guard for A16 (issue report
    `docs/issues/U19-A16-oai-argument-twice-server-error.md`): a request
    that gives `metadataPrefix`, `set` or `verb` twice answering the
    protocol's refusal ("Multiple values are not allowed for the …
    parameter", "Illegal OAI verb") (once fixed)
  - the guard for A17 (issue report
    `docs/issues/U19-A17-oai-malformed-identifier-answers-record.md`):
    GetRecord of an identifier with letters after the number, or with the
    app's start in its middle, answering "Identifier is not in a valid
    format" on a press and a preprint server, as a journal does
    {OMP OPS} (once fixed)
  - the guard for OMP3 (issue report
    `docs/issues/U19-OMP3-oai-unknown-set-lists-other-records.md`): a press
    asked for an unknown series, another press's path and an unknown path as
    `set`, each answering "No matching records in this repository" {OMP}
    (once fixed)
  - the guard for A2 (issue report
    `docs/issues/U19-A2-oai-from-until-ignore-time-of-day.md`): `from` and
    `until` given with a time of day listing only the records changed from,
    or until, that second (Rule 9a; once fixed)
  - the guard for A3 (issue report
    `docs/issues/U19-A3-oai-impossible-date-accepted.md`): ListRecords and
    ListIdentifiers given a `from` or `until` that is not in the calendar
    (month 13, 30 February, hour 25) answering "Illegal from parameter" or
    "Illegal until parameter" (Rule 9b; once fixed)
  - the guard for OPS4 (issue report
    `docs/issues/U19-OPS4-removed-preprint-server-no-deleted-records.md`): a
    second preprint server with a posted preprint removed under
    Administration › Hosted Servers: the site-wide GetRecord and list show
    the preprint as a deleted record {OPS} (once fixed)
  - the guard for A4 (issue report
    `docs/issues/U19-A4-oai-browser-last-part-says-more-results.md`): the
    browser view of a paged list's last part ending the list, with no
    "Resume" (Rule 13; once fixed)
  - the guard for A5 (issue report
    `docs/issues/U19-A5-oai-browser-record-formats-shown-as-archive.md`):
    the browser view of "formats" on a record's header naming the record and
    linking each format to that record (once fixed)
  - the guard for A12 (issue report
    `docs/issues/U19-A12-oai-marc-records-not-valid-for-their-schemas.md`):
    a journal's `marcxml` and `oai_marc` records valid for the schemas they
    name, with field 773, the issue date, the affiliation and the ISSN where
    a reader looks for them {OJS} (once fixed)
  - the guard for A15 (issue report
    `docs/issues/U19-A15-oai-marc-008-date-percent-signs.md`): a journal's
    MARC field 008 carrying the publication date as six digits and the year
    in both MARC formats {OJS} (once fixed)
  - the guard for A19 (issue report
    `docs/issues/U19-A19-oai-deleted-section-set-lists-nothing.md`): the set
    of a section whose "Abbreviation" was changed, or that was deleted,
    after an article in it was unpublished: asked for, it lists its deleted
    records {OJS OPS} (once fixed)
  - the guard for A20 (issue report
    `docs/issues/U19-A20-oai-section-set-deleted-records-ignore-dates.md`):
    a section's set asked with `from` or `until` leaving out the deleted
    records outside the dates {OJS OPS} (Rule 9d; once fixed)
  - the guard for A7 (issue report
    `docs/issues/U19-A7-oai-dc-peer-reviewed-type-gone-after-section-save.md`):
    a section with an empty "Identify items published in this section as
    a(n)" typing its articles the same before and after its window is saved
    {OJS} (once the team rules on the default, pkp/pkp-lib#10839)
  - the guard for A8 (issue report
    `docs/issues/U19-A8-oai-dc-source-keeps-empty-part.md`): the Dublin Core
    "Source" of an article in no issue and of a press record carrying only
    the parts it has, with no trailing or doubled "; " {OJS OMP} (once
    fixed)
  - the guard for OMP6 (issue report
    `docs/issues/U19-OMP6-oai-series-set-name-leading-space.md`): a press's
    ListSets naming a series that has no "Prefix" by its title, with no
    leading space {OMP} (once fixed)
  - the guard for A10 (issue report
    `docs/issues/U19-A10-oai-jats-list-refused-for-one-subscription-article.md`):
    a subscription journal's `jats` list holding an article of a
    subscription issue answering with the open articles' records {OJS} (once
    the team chooses the list's answer and it is fixed)
  - the guard for A23 (issue report
    `docs/issues/U19-A23-oai-driver-set-lists-article-without-galley.md`):
    with "DRIVER" enabled, an article published with no galley left out of
    the `driver` set {OJS} (Rule 23; once fixed)
  - the guard for A24 (issue report
    `docs/issues/U19-A24-oai-driver-list-says-more-results.md`): a journal's
    `driver` list ending without "Resume" when it holds every member, its
    "completeListSize" counting the members, and a set of more than a
    hundred members listed in parts to its end {OJS} (Rule 23; once fixed)
  - the guard for A11 (issue report
    `docs/issues/U19-A11-oai-driver-set-misses-deleted-record-of-article-in-no-issue.md`):
    with "DRIVER" enabled, an article published in no issue and then
    unpublished leaving a deleted record in the `driver` set {OJS} (Rule
    23a; once fixed)
- **Rarely met**:
  - a list longer than one answer holds (more than 100 records), paged
    with "Resume" to its last part (Rule 13): only a harvester pages
    through a list; no editor, author or reviewer meets it in running
    the journal
- **Nothing new to test**:
  - {OJS} DOIs with a "DOI Prefix": the article's DOI in "Resource
    Identifier" and in `marcxml` field 024 (Settings bullet 6)
  - the journal's texts typed on Settings › Journal: "Publisher" and the
    ISSNs in Identify and the records (Settings bullet 12)
  - {OJS} an issue unpublished or deleted, and a journal removed under
    Administration › Hosted Journals, leaving deleted records (Rule 4;
    Side effects)
  - {OMP} a format taken out of availability, a deleted record (Rule
    4a)
  - a request read in French: "Repository Name", the set names and the
    type words in French, and the plain address remembering the
    language (Rules 19, 19a)
  - {OJS} "Pages" filled beside the "Article Number", winning in
    "Source" and field 773 (Settings bullet 13)
  - a signed-in browser at the address of a journal closed to visitors,
    answered as signed in (Actors preamble; Rule 18)
  - {OJS} a signed-in Journal Manager or Section Editor reading `jats`:
    an article in a subscription issue served, the contributors' email
    addresses kept (Actors preamble; Rule 21a)
  - {OJS} an issue past its open access date: served in `jats`, not a
    `driver` member (Rules 21a, 23)
  - {OJS} "Users must be registered and log in to view open access
    content." ticked, "DRIVER" leaving the journal's records out
    (Settings bullet 9; Rule 23)
  - the site-wide ListSets, followed through its parts, naming every
    journal enabled publicly with its sections (Rule 16)
  - {OJS OPS} a journal at "Disable" still named in the site-wide
    ListSets (Rule 16)
  - the site-wide lists giving every journal's deleted records together
    at the end (Rule 6)
  - an OAI address naming a journal the site does not have, answering
    "404 Not Found" (Rule 16a)
  - a section "Abbreviation" with an accent and a space, "É D" read as
    "ED" in the set (Rule 7a)
  - {OJS} the "JATS Metadata Format" window's "Close" asking before it
    drops a change (Fields, the JATS window)
  - a journal with more than one language, its plain address sent on to
    `{journal address}/en/oai` (Rule 19a): the same forwarding as
    scenario 2's site-wide address
- **Register carries it**:
  - A1 {OJS OMP} (a journal's own address leaving out its deleted
    records and showing the first journal's in their place,
    "Earliest Datestamp" and GetRecord included, so an empty journal
    never answers "No matching records in this repository" while the
    first journal has deleted records; the site-wide
    `set` of one journal leaving them out; Rules 4b, 6, 15, 17a, 18;
    scenarios 1, 3 and 4 pass it)
  - A2, A3, A20, OPS1 (the time of day ignored; an impossible date or
    time accepted; a section's set ignoring the dates for deleted
    records; `until` failing on a preprint server; Rules 9a–9d; scenario
    5 passes OPS1)
  - A4 (the last part's "There are more results." and its failing
    "Resume"; Rule 13)
  - A5 (the browser view of one record's formats; the table of the
    answer's parts)
  - A6, A8, A12, A14, A15 ("Supporting Agencies", "Rights" and "Source"
    reaching no record; the source line's empty part; the MARC schemas;
    a galley's language code; field 008; the Dublin Core and MARC
    tables; scenario 8 passes A15)
  - A7 {OJS} ("Peer-reviewed Article" only for a section never saved in
    its window; the Dublin Core table)
  - A10 {OJS} (one refused article emptying a whole `jats` list; Rule
    21a)
  - A11 {OJS} (an article in no issue unpublished with "DRIVER" enabled;
    Rule 23a)
  - A13, A21 (records read in French with untranslated keys; a section's
    French set identifier; Rule 19)
  - A16, A17 (an argument given twice; a malformed identifier on a press
    and a preprint server; the table "Errors")
  - A18 {OMP OPS} (a datestamp that stays put after an edit or a second
    publish; Rule 5)
  - A19 (the set of a section that no longer exists; Rule 7c)
  - A22 {OJS} (per-version records on a journal with "DOI Versioning"
    on; Rules 20, 20a, 20b; Settings bullet 6): turning versioning on
    fails every journal's OAI requests on the install
  - A23, A24 {OJS} (a `driver` member with no galley; the set's "Resume"
    repeating records; Rules 23, 23a; scenario 10 passes A24)
  - OMP2 (a press with no "Enable OAI"; Rule 17)
  - OMP3 (a press given a set it does not have; Rule 8)
  - OMP4, OPS2 (a book or a preprint without an abstract; the Dublin
    Core table)
  - OMP6 (a series with no prefix; Rule 7b)
  - OMP7 (a book's new version changing its format identifiers; Rule 4a)
  - OPS3 (a preprint server's "Identify items posted in this section as
    a(n)"; Settings bullet 11)
  - OPS4 (a removed preprint server leaving no deleted record; Side
    effects)
- **No seed**:
  - the install's configuration file: the interface switched off,
    another repository identifier, another number of records per answer
    (Settings bullet 14; Rule 24)
  - {OMP} a book in a series beside one in none, and the series' sets
    (Rule 7b): a scratch press cannot be given a series
- **Owned by another feature**:
  - the roles kept out of the Settings pages, and so out of "Enable OAI"
    and the plugins (Actors preamble; *[Journal identity & about
    pages](U07-journal-identity-and-about-pages.md)*, scenario 2)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-26), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | A journal's own OAI address leaves out its deleted records and lists the first journal's instead {OJS OMP} | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A2](#a2) | OAI-PMH lists ignore the time of day in "from" and "until" and return the whole day's records | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A3](#a3) | OAI-PMH lists accept a "from" or "until" date that is not in the calendar instead of refusing it | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A4](#a4) | The browser view of the last part of a long OAI-PMH list says "There are more results." and offers a "Resume" that is refused | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A5](#a5) | The browser view of one OAI-PMH record's formats reads "available from this archive" and has no links to that record | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A7](#a7) | Saving a journal section removes "Peer-reviewed Article" from its articles' OAI-PMH Dublin Core records {OJS} | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A8](#a8) | The OAI-PMH Dublin Core "Source" ends in "; " for an article in no issue and for every book {OJS OMP} | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A10](#a10) | On a subscription journal, the OAI-PMH record list in JATS is refused whole when it holds one article that needs a subscription {OJS} | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A11](#a11) | An article in no issue, once unpublished, has no deleted record in the journal's `driver` OAI set {OJS} | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A12](#a12) | A journal's MARC records in OAI-PMH do not follow the schemas they name, and software reading them misses the journal, the issue date, the ISSN or the affiliations {OJS} | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A13](#a13) | Records read in French carry untranslated keys {OJS OMP} | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A15](#a15) | A journal's MARC records in OAI-PMH write the publication date in field 008 with "%" signs ("%26%09%30 %2026") {OJS} | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A16](#a16) | An OAI-PMH request that gives an argument twice gets a server error instead of the refusal message | 🐞 | low · crash: server | issues (claude), 2026-10-01 — re-verified |
| [A17](#a17) | OAI-PMH GetRecord answers a malformed identifier with a record, not "Identifier is not in a valid format" {OMP OPS} | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A18](#a18) | A press's or preprint server's OAI record keeps its earlier datestamp after an edit or a second publish {OMP OPS} | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A19](#a19) | An OAI set left behind by a changed section abbreviation or a deleted section is listed but lists nothing {OJS OPS} | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A20](#a20) | Asked for a section's set, OAI lists return its deleted records whatever "from" and "until" say {OJS OPS} | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A22](#a22) | Once one journal sets "DOI Versioning" to "Yes", every journal's OAI-PMH requests answer a server error {OJS} | 🐞 | medium · crash: server | issues (claude), 2026-10-01 — re-verified |
| [A23](#a23) | A journal's `driver` OAI set lists articles that have no galley {OJS} | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A24](#a24) | On 3.5 a journal's `driver` OAI list stops after a hundred records; on every version it offers "Resume" when complete {OJS} | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [OMP3](#omp3) | Asked for a set it does not have, a press's OAI-PMH address lists every record of the press, or of every press | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [OMP4](#omp4) | A press's OAI-PMH record lists answer a server error once one book is published without an abstract | 🐞 | high · crash: server | issues (claude), 2026-10-01 — re-verified |
| [OMP6](#omp6) | A press's OAI-PMH set list names every series that has no prefix with a leading space | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [OPS1](#ops1) | A preprint server's OAI-PMH lists answer a server error whenever the harvester gives an "until" date | 🐞 | medium · crash: server | issues (claude), 2026-10-01 — re-verified |
| [OPS2](#ops2) | One preprint without an abstract makes the server's record lists fail | 🐞 | user-visible · crash: server | — |
| [OPS4](#ops4) | Removing a preprint server leaves no deleted records for its posted preprints at the site-wide OAI address | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A6](#a6) | "Supporting Agencies", "Rights" and "Source" reach no record | ❓ | minor | — |
| [A9](#a9) | A journal that does not publish online still hands out records, the MARC ones with the article's address {OJS} | ❓ | minor | — |
| [A14](#a14) | "Language" writes a galley's language with an underscore {OJS OPS} | ❓ | minor | — |
| [A21](#a21) | A section has one set identifier per language {OJS OPS} | ❓ | minor | — |
| [OMP2](#omp2) | A press cannot withhold its records: it has no "Enable OAI" | ❓ | minor | — |
| [OMP7](#omp7) | A book's new version changes its format identifiers without leaving deleted records | ❓ | minor | — |
| [OPS3](#ops3) | "Identify items posted in this section as a(n)" reaches no record | ❓ | minor | — |
| [OMP1](#omp1) | A press's record is a publication format, not a book | ✅ | invisible | — |
| [OMP5](#omp5) | Retired: an address with no press answers as the whole site | ✅ | retired | — |

### All apps

<a id="a1"></a>
**A1 — A journal's own OAI address leaves out its deleted records and lists the first journal's instead** {OJS OMP} · 🐞 · medium.
A harvester of one journal's OAI address expects an unpublished article
to come back as a deleted record, so it can drop it. On every journal
except the one with ID 1 (the first created on the installation), the
record disappears instead: the journal's lists leave it out and
GetRecord answers "No matching identifier in this repository". The
site-wide address, when asked for that journal's set, leaves the
journal's deleted records out too. The journal's published records are
listed correctly throughout. In place of its own deleted records, such a
journal's lists and GetRecord show those of journal 1. They carry
journal 1's identifiers and its set, which the journal's own ListSets
does not name, and the journal's "Earliest Datestamp" becomes the oldest
of them. This half needs nothing unpublished in the journal itself: it
shows even on a journal with nothing published, as soon as journal 1 has
a deleted record. The harvester keeps showing the withdrawn article, and
nothing tells the journal. The fault needs an installation with more
than one journal. A press does the same with its publication formats; a
preprint server is not affected.
Since: 2021-06-08 · Basis: probe, 2026-10-01. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — OAI-PMH lists ignore the time of day in "from" and "until" and return the whole day's records** · 🐞 · low.
A harvester that asks an OAI-PMH list for the records changed since a
time of day gets every record changed on that day. Identify announces
the granularity "YYYY-MM-DDThh:mm:ssZ", so `from=2026-09-30T12:30:14Z`
should list only the records changed from that second on. `until` with a
time likewise takes in the whole of its day. On an install whose time
zone is UTC, every record inside the range asked is listed, so such a
harvest only repeats records the harvester already has. A validator that
checks the announced granularity reports the repository as failing it.
Every list with a time in `from` or `until` does this, for published and
for deleted records, with no setup.
Basis: probe, 2026-10-01. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — OAI-PMH lists accept a "from" or "until" date that is not in the calendar instead of refusing it** · 🐞 · low.
A harvester whose ListRecords or ListIdentifiers request carries a
`from` or `until` date that is not in the calendar gets an answer
instead of the refusal "Illegal from parameter" or "Illegal until
parameter". With month 13 or hour 25 in `from`, the date is dropped and
every record is listed, as if no date had been given. With month 13 in
`until`, the answer is "No matching records in this repository",
whatever the records' dates. A day the month does not have is accepted
too: `from=2030-02-30` is answered like a real date in 2030. A date
written in the wrong shape, such as "30-02-2030", is refused as it
should be. Both requests do this on every install, with no setup.
Basis: probe, 2026-10-01. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — The browser view of the last part of a long OAI-PMH list says "There are more results." and offers a "Resume" that is refused** · 🐞 · low.
A manager or developer who reads a journal's OAI-PMH address in a
browser and pages through a long list with "Resume" reaches the last
page of the list. That page still shows "There are more results." and a
"Resume" link, which answers "The requested resumptionToken is invalid
or has expired". Nothing is missing from the list: every record was
shown before that link. Harvesters, which read the XML, are not misled.
It shows on the last page of any list too long for one page: more than
100 records or sets (500 on the list of identifiers), or fewer records
or sets where the site administrator lowered the number per page.
Basis: probe, 2026-10-01. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — The browser view of one OAI-PMH record's formats reads "available from this archive" and has no links to that record** · 🐞 · low.
A manager or developer who reads a journal's OAI-PMH address in a
browser sees a "formats" link beside each record of a list. Pressing it
should open a page that says which formats that record comes in, with a
link to the record in each. The page says "This is a list of metadata
formats available from this archive." instead. It is the same page as
the formats of the whole archive. The formats listed are the record's
own, but each links to the list of every record in that format, not to
the record. It happens for every record, with no setup. Harvesters,
which read the XML, are not affected.
Basis: probe, 2026-10-01. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — Three metadata items reach no record** · ❓ · minor.
An editor who fills "Supporting Agencies", "Rights" or "Source" on the
version's "Metadata" page expects harvesters to receive them, as they
receive "Coverage" and "Type". No format carries them: the Dublin Core
"Other Contributor" row, meant for supporting agencies, is never
written, and "Rights Management" carries the copyright line and the
license only.
Question: should the records carry these three items? Lean: 🐞 for
"Supporting Agencies", which the Dublin Core record still reads from a
field removed in 2019; ❓ for "Rights" and "Source".
Since: 2019-06-26 · Basis: probe, 2026-09-26. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — Saving a journal section removes "Peer-reviewed Article" from its articles' OAI-PMH Dublin Core records** {OJS} · 🐞 · low.
A journal section's edit form has a box "Identify items published in
this section as a(n)". While the box is empty, the OAI-PMH Dublin Core
record of each article in the section gives "Peer-reviewed Article" as a
resource type, beside "info:eu-repo/semantics/article" and
"info:eu-repo/semantics/publishedVersion". That holds only until someone
saves the form. From then on the records keep the two "info:eu-repo"
values and lose "Peer-reviewed Article", although the box is still
empty. A Journal Manager who opens a section and presses "Save", for any
reason, changes every record of the section and is not told. A section
created through the form never has the default. Only a section made with
a new journal, or imported, still gives it. This report takes the
default for an empty box as the intended behaviour and the loss on save
as the fault. The open `pkp/pkp-lib#10839` questions the default itself,
so the team's decision on that issue comes first: if the default goes,
the fix is to remove it everywhere, not to restore it.
Basis: probe, 2026-10-01. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — The OAI-PMH Dublin Core "Source" ends in "; " for an article in no issue and for every book** {OJS OMP} · 🐞 · low.
The "Source" of a journal article's Dublin Core record is meant to read
"{journal name}; {issue}; {pages}", leaving out a part the article lacks
together with its separator. An article published without an issue reads
"{journal name}; " instead, and "{journal name}; ; 15-20" when it has
pages: the separator of the missing issue stays. Every book record of a
press reads "{press name}; ", since a book has neither an issue nor
pages. The names and pages in the line are right; it is malformed for
whoever splits it at "; ". The press half is long-standing and shows on
every press. The journal half is new and not yet released: it needs an
article published with "Don't Assign To An Issue", a choice that
journals did not have before.
Basis: probe, 2026-10-01. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — A journal that does not publish online still hands out records** {OJS} · ❓ · minor.
A journal set to "OJS will not be used to publish the journal's contents
online." refuses visitors on its article pages (a signed-out visitor is
sent to the Login page, a signed-in Reader reads "This journal does not
publish its content online."), yet its OAI address lists every
published article. The Dublin Core record drops the article's and
galleys' addresses; the MARC records keep the article page's address in
field 856, which leads there.
Question: should such a journal hand out records at all, and if so,
should MARC drop the address too? Lean: keep the records (the journal
may index work published elsewhere) and drop the address from MARC.
Basis: probe, 2026-09-26. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — On a subscription journal, the OAI-PMH record list in JATS is refused whole when it holds one article that needs a subscription** {OJS} · 🐞 · medium.
On a subscription journal with "JATS Metadata Format" on, a harvester
that asks for the list of records in `jats` gets one error, "Cannot
disseminate format (unauthenticated access to JATS XML not allowed)", as
soon as the list holds one article of a subscription issue. The articles
that need no subscription are lost with it. The list comes in parts of
100 records: the part that holds such an article is refused, and the
harvester cannot reach the parts after it. The right answer for a list
is a choice for the team: leave the restricted articles out of the
`jats` list, or list them with their metadata and without their text.
Today's answer is neither. The harvester can still get the open articles
one at a time, since ListIdentifiers lists every article and GetRecord
serves each open one. The plugin ships with OJS on `main` and 3.5 and is
off by default. The same records in Dublin Core are not affected.
Basis: probe, 2026-10-01. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — An article in no issue, once unpublished, has no deleted record in the journal's `driver` OAI set** {OJS} · 🐞 · medium.
With the "DRIVER" plugin enabled, a Journal Manager unpublishes an
article that was published without an issue ("Don't Assign To An
Issue"). The deleted record this leaves is stored without its place in
the `driver` set, so a harvest of that set shows neither the article nor
a notice that it was deleted. An article unpublished from an issue
leaves a deleted record in the set. A service that harvests the set
keeps the withdrawn article, and nothing on screen says so. It happens
on every journal with the plugin enabled, each time such an article is
unpublished.
Basis: probe, 2026-10-01. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — A journal's MARC records in OAI-PMH do not follow the schemas they name, and software reading them misses the journal, the issue date, the ISSN or the affiliations** {OJS} · 🐞 · medium.
A harvester that checks a journal's `marcxml` records against the MARC21
schema they name finds every one invalid, and so does one that checks
the `oai_marc` records against theirs. Five things are wrong: -
`marcxml` writes field 773 (the journal's name and the issue) with the
attribute names of `oai_marc`. This came after 3.5 and is on main only.
- `marcxml` writes the element of the issue's date in field 260 as
"dataField", where the schema's name is "datafield". - `oai_marc` writes
each affiliation with the attribute name of `marcxml`. - `oai_marc`
names the ISSN's subfield "$a" where the schema's name is "a". - Both
write the indicators of the ISSN field, and `marcxml` those of the DOI
field, as "#", which neither schema allows. Software that reads a record
without checking it, and takes the fields by element name, field number
and subfield code, loses nothing to the "#" indicators. It silently
finds no field for the other four: no journal and issue and no issue
date in `marcxml`, no ISSN and no affiliation in `oai_marc`. Every
article of every journal is affected, in both formats, which are always
on. The same records in Dublin Core are not affected.
Basis: probe, 2026-10-01. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — Records read in French carry untranslated keys** {OJS OMP} · 🐞 · low.
A harvester reading `…/fr_CA/oai` expects French words. A book's
"Resource Type" reads "##rt.metadata.pkp.dctype##" instead of the French
for "Book", and an article's MARC 251 and 780 read
"##publication.versionStage.display##" instead of its version, such as
"Version of Record 2.0".
Basis: probe, 2026-10-01. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — "Language" writes a galley's language with an underscore** {OJS OPS} · ❓ · minor.
A record's "Language" lists each galley's language as its locale code,
such as "fr_CA", while the same record marks its French values "fr-CA".
A harvester that matches language tags does not recognise "fr_CA".
Question: should "Language" carry a language tag ("fr-CA") instead?
Lean: 🐞; the record already writes the tag everywhere else.
Basis: probe, 2026-09-26. <sup>f-a14</sup>

<a id="a15"></a>
**A15 — A journal's MARC records in OAI-PMH write the publication date in field 008 with "%" signs ("%26%09%30 %2026")** {OJS} · 🐞 · medium.
A harvester reading MARC field 008 of a journal's article expects the
article's publication date as six digits, then the publication year,
such as "260930 2026" for 30 September 2026. Every `oai_marc` and
`marcxml` record carries "%26%09%30 %2026" in its place. On a server
whose time zone is east of UTC the day is also the one before:
"%26%09%29 %2026". Field 008 is read by position, and the four "%" signs
move everything after them. Software that takes the field by position
gets, without any error, "%26%09" as the date, "30 %" as the year and
blanks as the language code. The same record in Dublin Core carries the
date correctly.
Basis: probe, 2026-10-01. <sup>f-a15</sup>

<a id="a16"></a>
**A16 — An OAI-PMH request that gives an argument twice gets a server error instead of the refusal message** · 🐞 · low · crash: server.
The app fails with a server error when a harvester sends an OAI-PMH
request that gives an argument twice, such as
`metadataPrefix=oai_dc&metadataPrefix=oai_dc`. The harvester expects the
refusal "Multiple values are not allowed for the metadataPrefix
parameter", or "Illegal OAI verb" when the repeated argument is `verb`.
It gets an empty page with status 500 instead. Such a request is
malformed and is refused on every version, so no record and no
well-formed request is affected, and the next request is answered as
usual. Every request name and every argument is affected, at a
journal's, press's or preprint server's own OAI-PMH address and at the
site-wide one.
Basis: probe, 2026-10-01. <sup>f-a16</sup>

<a id="a17"></a>
**A17 — OAI-PMH GetRecord answers a malformed identifier with a record, not "Identifier is not in a valid format"** {OMP OPS} · 🐞 · low.
On a press and a preprint server, the OAI-PMH address answers a
malformed record identifier as if it were well formed. Every identifier
of the app begins with a fixed start (`oai:{repository
identifier}:publicationFormat/` on a press, `…:preprint/` on a preprint
server), and the record's number follows it. - An identifier with a
number and then anything else after the start, such as `…/2abc`, makes
GetRecord answer record 2. - An identifier with no number after the
start, such as `…/abc`, makes it answer "No matching identifier in this
repository". - For `…/2abc`, ListMetadataFormats lists the formats of
record 2. A harvester expects "Identifier is not in a valid format" from
GetRecord and "No matching identifier in this repository" from
ListMetadataFormats. A journal on main answers so; a journal on 3.5 and
earlier answers like the other two. A malformed identifier reaches no
record a well-formed one could not. It goes through the same lookup, in
the same press or preprint server and among published records only, and
the record comes back under its own, correct identifier. The harvester
is only not told that its identifier was malformed.
Basis: probe, 2026-10-01. <sup>f-a17</sup>

<a id="a18"></a>
**A18 — A press's or preprint server's OAI record keeps its earlier datestamp after an edit or a second publish** {OMP OPS} · 🐞 · medium.
A harvester that asks for the records changed since its last visit
expects an edited item, or one published again, to come back. On a press
and a preprint server the datestamp stays where it was before the
change: a saved edit of the published version does not move it, and an
item published again after "Unpublish" ("Unpost") comes back with its
earlier datestamp, older than its deleted record's. A harvester that
harvested the deleted record never sees the item come back, and one that
holds the item never learns it was edited. Nothing tells the press, and
no screen moves the datestamp. Publishing again moved the datestamp
until 3.3; editing a published version is new with 3.5 and has never
moved it. A journal's datestamp moves in both cases, because a journal's
records also take the date of the published version.
Basis: probe, 2026-10-01. <sup>f-a18</sup>

<a id="a19"></a>
**A19 — An OAI set left behind by a changed section abbreviation or a deleted section is listed but lists nothing** {OJS OPS} · 🐞 · medium.
When a section's "Abbreviation" is changed, the deleted records of
articles unpublished in it before the change can no longer be harvested
by section. ListSets names two sets for the section, the old identifier
and the new one. Asking for the old set answers "No matching records in
this repository", and the new set lists the section's published articles
without those deleted records. The same happens to the set of a section
that was deleted after its unpublished article was moved to another
section: ListSets still names it, and asking for it lists nothing. Both
show for ListRecords and ListIdentifiers, at the journal's address and
the site-wide one. A service that harvests by section keeps the
withdrawn article and is not told. The journal's own set and a list
without a set do carry the deleted records. A press's series were not
checked on screen.
Basis: probe, 2026-10-01. <sup>f-a19</sup>

<a id="a20"></a>
**A20 — Asked for a section's set, OAI lists return its deleted records whatever "from" and "until" say** {OJS OPS} · 🐞 · low.
A harvester asks ListRecords or ListIdentifiers for one section's set
with `from=2030-01-01` and expects nothing. It gets every deleted record
of the section: the articles unpublished in it, whatever the date they
were unpublished. `until` is ignored the same way. In an ordinary date
window the section's deleted records come beside the records that belong
in the window. A harvester that collects a section's changes since its
last visit receives all the section's deleted records again on every
visit. Only a section's set does this, and only for deleted records. The
journal's set and a list without a set keep to the dates, and so do the
section's published records.
Basis: probe, 2026-10-01. <sup>f-a20</sup>

<a id="a21"></a>
**A21 — A section has one set identifier per language** {OJS OPS} · ❓ · minor.
A harvester reading `…/fr_CA/oai` gets a section's set as
"{journal path}:ARTF" when its French "Abbreviation" is "ARTF", and
"{journal path}:ART" in English: one section, two set identifiers, and
each record's header follows the language of the request.
Question: should a set identifier follow the request's language? Lean:
🐞; a harvester that stored "…:ART" finds nothing under "…:ARTF", and
the plain address can send the same harvester to either (Rule 19a).
Basis: probe, 2026-09-26. <sup>f-a21</sup>

<a id="a22"></a>
**A22 — Once one journal sets "DOI Versioning" to "Yes", every journal's OAI-PMH requests answer a server error** {OJS} · 🐞 · medium · crash: server.
A Journal Manager sets "DOI Versioning" to "Yes, assign a unique DOI to
every version of an article." on a journal that has DOIs enabled. From
then on these OAI-PMH requests answer a server error with an empty page:
Identify, ListRecords, ListIdentifiers, GetRecord and
ListMetadataFormats for an identifier. ListSets still answers. The
failure is not limited to that journal. Every other journal of the
install and the site-wide OAI-PMH address fail the same way, so no
harvester can read anything from the install until the setting is back
at "No". It was seen on PostgreSQL. MySQL and MariaDB were not run.
Basis: probe, 2026-10-01. <sup>f-a22</sup>

<a id="a23"></a>
**A23 — A journal's `driver` OAI set lists articles that have no galley** {OJS} · 🐞 · low.
A harvester asking a journal for its `driver` set expects only
open-access articles with full text. With the "DRIVER" plugin enabled,
an open-access article published with no galley is listed in the set
beside the articles that have one. Its record carries the set's name
wherever it is listed: in the journal's list without a set, in the
identifiers list and when asked for alone. When such an article is
unpublished, the deleted record it leaves is stored as belonging to the
set as well. The open-access half of the set's rule holds: an article
that readers must pay or sign in for stays out, with or without a
galley.
Basis: probe, 2026-10-01. <sup>f-a23</sup>

<a id="a24"></a>
**A24 — On 3.5 a journal's `driver` OAI list stops after a hundred records; on every version it offers "Resume" when complete** {OJS} · 🐞 · medium.
The "DRIVER" plugin adds the set `driver` to a journal's OAI address. On
3.5, a harvester that lists the records of that set on a journal with
more than a hundred of them gets the first hundred and no "Resume": the
other records are never listed. On every version, the set's list also
goes wrong as soon as the journal has a record outside the set (an
article that is not open access, or a deleted record made while the
plugin was off). The answer then says "There are more results." when it
holds every member, with a "completeListSize" that counts the journal's
whole list. "Resume" returns records the harvester already has when a
member follows in the journal's list, and the error "No matching records
in this repository" when none does. Both come from one cause: the plugin
takes one part of the journal's whole list and only then drops the
records outside the set, so its count of what remains is wrong. On
`main` the count is too high, which gives the false "Resume" and loses
nothing in the lists walked. From 3.3 to 3.5 a 2020 change made the
count too low, which ends the list early; a 2026 rewrite on `main` undid
that.
Basis: probe, 2026-10-01. <sup>f-a24</sup>

### OMP

<a id="omp1"></a>
**OMP1 — A press's record is a publication format** · ✅ · invisible.
A press hands out one record per publication format of a published book
made available to readers, identified as "publicationFormat/{number}",
and a book with no such format has none; a journal and a preprint server
hand out one record per article or preprint.
Basis: probe, 2026-09-26. <sup>f-omp1</sup>

<a id="omp2"></a>
**OMP2 — A press has no "Enable OAI"** · ❓ · minor.
A Press Manager who does not want the press harvested finds no "Enable
OAI" (a press's Distribution settings have no "Access" tab); the press's
records are always handed out.
Question: should a press get the switch a journal and a preprint server
have? Lean: yes; the switch was added for the other two apps only.
Basis: probe, 2026-09-26. <sup>f-omp2</sup>

<a id="omp3"></a>
**OMP3 — Asked for a set it does not have, a press's OAI-PMH address lists every record of the press, or of every press** · 🐞 · medium.
A harvester that sends ListRecords or ListIdentifiers to a press's
OAI-PMH address with a set the press does not have expects "No matching
records in this repository", as a journal and a preprint server answer.
A press answers with records instead. This is one fault with two
outcomes. For a set written as the press's own path and a series it does
not have (`publicknowledge:nosuchseries`), the answer is every record of
the press. For any other unknown set, another press's set included, it
is every record of every press on the installation. Each record names
its real set, and nothing in the answer says the set was not found. A
harvester set up for one set is therefore handed books that are not in
that set, with no error. The fault needs a request for a set the press
does not have: a mistyped one, or the set of a series that has since
been removed or given another path. A set the press has is answered
correctly. The site-wide address answers a press's set correctly and an
unknown set with every press's records.
Basis: probe, 2026-10-01. <sup>f-omp3</sup>

<a id="omp4"></a>
**OMP4 — A press's OAI-PMH record lists answer a server error once one book is published without an abstract** · 🐞 · high · crash: server.
When a press publishes a book that has no abstract in any language,
which the press's forms allow at submission and in the workflow, the
press's OAI-PMH ListRecords answers a server error instead of the page
of the list that holds the book. GetRecord for that book fails the same
way. ListIdentifiers still answers. ListRecords is served in pages of up
to 100 records. A harvester gets status 500 and an empty answer for the
page that holds the book, so it loses every record of that page and
cannot go on to the pages after it. On a press with fewer than 100
records that is the whole list. The site-wide address fails on the same
page, which there also holds the other presses' records. Nothing tells
the press: the book's page and the workflow look right. The list answers
once the book has an abstract. Dublin Core is the only format a press
offers, so the harvester has no other format to ask for.
Basis: probe, 2026-10-01. <sup>f-omp4</sup>

<a id="omp6"></a>
**OMP6 — A press's OAI-PMH set list names every series that has no prefix with a leading space** · 🐞 · low.
A harvester reading a press's ListSets expects each series named by its
title. A series with no "Prefix" is named " Library & Information
Studies", with a leading space. Opened in a web browser, the same list
shows the name without the space. In OAI-PMH the space is in the set
list only: a record names its set by identifier, which is right. The
default dataset's five series have no prefix, so all five are named this
way.
Basis: probe, 2026-10-01. <sup>f-omp6</sup>

<a id="omp7"></a>
**OMP7 — A new version changes a book's format identifiers** · ❓ · minor.
After "Version of Record 2.0" of a book with two formats is published,
the press lists two new format identifiers instead of the old two, and
GetRecord for the old ones answers "No matching identifier in this
repository", with no deleted record. A harvester gains two records and
never drops the old ones.
Question: should a new version keep the format identifiers, or leave
deleted records for the old ones? Lean: 🐞 either way; as built, a
harvester holds every versioned book twice.
Basis: probe, 2026-09-26. <sup>f-omp7</sup>

### OPS

<a id="ops1"></a>
**OPS1 — A preprint server's OAI-PMH lists answer a server error whenever the harvester gives an "until" date** · 🐞 · medium · crash: server.
A harvester that asks a preprint server for the records changed until a
date gets a server error instead of a list. The answer is an empty page
with status 500, for ListRecords and ListIdentifiers, at the preprint
server's own OAI-PMH address and at the site-wide one, whatever the
date. Harvesting a preprint server in slices of dates, each with a
`from` and an `until`, is therefore impossible. The same lists answer
normally when `until` is left out.
Since: 2021-06-11 · Basis: probe, 2026-10-01. <sup>f-ops1</sup>

<a id="ops2"></a>
**OPS2 — A preprint without an abstract breaks the server's lists** · 🐞 · user-visible · crash: server.
One preprint posted without an abstract makes the server's record lists
fail; [Sections](U17-sections.md#ops6) carries the entry (its OPS6).
Basis: probe, 2026-09-26. <sup>f-ops2</sup>

<a id="ops3"></a>
**OPS3 — The section type reaches no record** · ❓ · minor.
A Preprint Server Manager fills a section's "Identify items posted in
this section as a(n)" expecting its preprints to be typed that way, as a
journal's articles are. No record or page uses it: every preprint is
typed "info:eu-repo/semantics/preprint".
Question: should the box be removed from a preprint server's section
window, or reach the records? Lean: remove it; the server's records
dropped it on purpose in 2019.
Since: 2019-11-21 · Basis: probe, 2026-09-26. <sup>f-ops3</sup>

<a id="ops4"></a>
**OPS4 — Removing a preprint server leaves no deleted records for its posted preprints at the site-wide OAI address** · 🐞 · medium.
A Site Administrator removes a preprint server under Administration ›
Hosted Servers. The installation's Identify answer declares its "Deleted
Record Policy" as "persistent", so a harvester of the site-wide OAI
address expects each posted preprint of that server to come back as a
deleted record, as a removed journal's or press's records do. Instead
GetRecord answers "No matching identifier in this repository", and
ListRecords and ListIdentifiers no longer name the preprints. The
removed server's own OAI address is gone with it, so the site-wide
address is the only place its deleted records could be read. It was
checked on an installation that keeps another preprint server; removing
an installation's only server was not checked.
Basis: probe, 2026-10-01. <sup>f-ops4</sup>

### Retired

<a id="omp5"></a>
**OMP5 — An address with no press answers as the whole site** · ✅ · retired. Overturned 2026-09-26: seen on a press's install, the address answers "404 Not Found", as on a journal's (Rule 16a). <sup>f-omp5</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-26 at the checkouts: ojs `71bb244152` (the working tree) and `d9b567efec` (the upstream-sync baseline, read with `git show` for the four commits after the tree: pkp/ojs#5825), omp `187f0f40d`, ops `61cd158ce3`, lib/pkp `76a315591b` in all three; `plugins/oaiMetadataFormats/oaiJats` at `627c488`. Every claim was then driven on 2026-09-26 on OJS (at `d9b567efec`), OMP and OPS, on scratch journals, presses and preprint servers made through the scenario API with throwaway accounts, each OAI answer read signed out both as its raw XML and as the browser view; the `q` notes record what each probe saw, and the `f-` notes the probe behind each finding.

<a id="fn-a"></a>
**a** — Entry: `pages/oai/index.php` (op `index` only) → `APP\pages\oai\OAIHandler::index()` in each app, which loads the `oaiMetadataFormats` plugin category and runs `JournalOAI` (OJS), `PressOAI` (OMP) or `ServerOAI` (OPS), all `extends PKP\oai\OAI`, with `new OAIConfig($request->url(null, 'oai'), Config::getVar('oai', 'repository_id'))`. No template, menu or email links the address: the only other producers of the URL are `PKPInstall` (writes `[oai] repository_id`) and `VersionCheck` (sends the site's OAI URL to PKP's version check). `OAI::response()` sends `Content-Type: text/xml` with `<?xml-stylesheet type="text/xsl" href="{base}/lib/pkp/xml/oai2.xsl"?>`; `lib/pkp/xml/oai2.xsl` (Christopher Gutteridge's EPrints XSLT, v1.1) builds the browser view: title/heading "OAI 2.0 Request Results", template `quicklinks` (Identify, ListRecords and ListIdentifiers with `metadataPrefix=oai_dc`, ListSets, ListMetadataFormats), the intro paragraph, the "Datestamp of response" / "Request URL" table (`oai:request` text is the base URL; the arguments are attributes), "OAI Error(s)" / "Request was of type …", the per-answer templates quoted in the Fields tables, and the footer "About the XSLT". Records: `oai:record` → "OAI Record: {identifier}", `oai:header` → "OAI Record Header" with the `oai_dc` and `formats` links, `@status='deleted'` → "This record has been deleted.", `oai:setSpec` → "setSpec" with "Identifiers" / "Records"; `oai_dc:dc` → "Dublin Core Metadata (oai_dc)" with the row labels of the Dublin Core table (`dc:relation` longer than 50 characters shows as a "URL" link and "URL not shown as it is very long."); any other metadata → "Unknown Metadata Format" and the XML as text. The U19 screen notes record that the Playwright kit's motion helper logs "Cannot read properties of null (reading 'appendChild')" on these XSLT pages (the kit's own error) and that the raw XML is best read through a request, not the rendered page. Formats per app: OJS `plugins/oaiMetadataFormats/{dc,marc,marcxml,oaiJats}`, OMP and OPS `plugins/oaiMetadataFormats/dc` only. Live-probed 2026-09-26 (Purpose; Rule 1; the browser view), all three apps: no `a`, `link` or `meta` element of the context's home, About, Contact, Submissions, an item page, the archive, search, the site's home, or the Journal Manager's Dashboard and Distribution pages points at the address; the view's strings, links and blocks read as the Fields section quotes them, each top link opening its request; each "Set" block links "Identifiers" and "Records" to `?verb=ListIdentifiers|ListRecords&metadataPrefix=oai_dc&set=…`; "formats" on a header opens ListMetadataFormats with the identifier (A5).

<a id="fn-b"></a>
**b** — Access. OJS and OPS `OAIHandler.php` call `PKPSessionGuard::disableSession()` at file load and override `validate()` (not calling the parent) and `requireSSL()` (false); they do not override `authorize()`, so `PKPHandler::authorize()` adds `RestrictedSiteAccessPolicy` (applies when the context's `restrictSiteAccess` is set; permits when `Validation::isLoggedIn()` or the page is a login exemption: `user`, `login`, `help`, `header`, `sidebar`, `payment`, `invitation`, not `oai`) and, only when the session is enabled, `UserRolesRequiredPolicy`. On denial `PKPPageRouter::handleAuthorizationFailure()` redirects to Login when `$request->getUser()` is empty. `PKPPageRouter::route()` sends a signed-out request for a context that is not enabled to `login` (checked only while the session is enabled, which is before the OAI handler's file is loaded). OJS and OPS `validate()` also decode an `Authorization: Bearer` API key into `setApiToken()`, after the access decision; nothing the OAI interface serves depends on it (UNASSIGNED item 36). OMP `OAIHandler` also calls `PKPSessionGuard::disableSession()` at file load, overrides `authorize()` to call the parent and then return false when `[oai] oai` is off, and has no `validate()` override. On all three apps the session is still read on this page, so a signed-in browser is answered as signed in (Rule 18), and `jats` sees its user (note h). Settings access: `CanAccessSettingsPolicy` ([→ settings access](U07-journal-identity-and-about-pages.md#settings-access)). "Enable this journal to appear publicly on the site": `ContextService::edit()` (OJS, OMP, OPS) inserts tombstones for every published submission when `enabled` goes off and deletes them when it comes back (note n). Live-probed 2026-09-26 (Actors preamble, rows 1–3; Rule 18): note q1.

<a id="fn-c"></a>
**c** — `OAI::__construct()` reads the parameters from `HTTP_RAW_POST_DATA`, else the raw `QUERY_STRING` through `OAIUtils::parseStr()` (a repeated key becomes an array), else `$_GET`/`$_POST`, then `OAIUtils::prepInput()` (`urldecode`). `OAI::execute()` switches on `verb` exactly (`GetRecord`, `Identify`, `ListIdentifiers`, `ListMetadataFormats`, `ListRecords`, `ListSets`), else `error('badVerb', 'Illegal OAI verb')`. `checkParams($required, $optional)`: `verb` plus the required ones must exist and be single; optional ones single; any other key is `"{k} is an illegal parameter"`. With `resumptionToken`, `checkParams(['resumptionToken'])` runs first, so any other argument is illegal. `OAIConfig`: `granularity` 'YYYY-MM-DDThh:mm:ssZ', `tokenLifetime` 86400, `maxIdentifiers` 500, `maxRecords` from `[oai] oai_max_records` (100 when unset), `maxSets` 50 (only its non-zero value is used; `listSets()` pages by `maxRecords`). Live-probed 2026-09-26 (the two addresses, the six requests; Rule 2), all three apps: every request and argument answered as the tables give them; a form sent by POST answered as the address does; `verb=identify` answered "Illegal OAI verb" and `metadataprefix=oai_dc` "Missing metadataPrefix parameter"; ListRecords held 100 records per answer at the site-wide address, ListIdentifiers 500 on OJS (OMP and OPS held fewer than 500 records in all); a context with more than one language, and the site, answered the plain address with a 302 to `…/en/oai`, a one-language scratch context at `…/oai` (note u). A repeated argument: note f-a16.

<a id="fn-d"></a>
**d** — `OAI::identify()` writes `repositoryName` (through `prepOutput`), `baseURL` (the config's `baseUrl`, `$request->url(null, 'oai')`), `protocolVersion` "2.0", `adminEmail`, `earliestDatestamp` (`OAIUtils::UTCDate()`, which prints the current time for 0), `deletedRecord` "persistent", `granularity`, `compression` gzip and deflate when zlib is loaded, an `oai-identifier` description (scheme "oai", `repositoryIdentifier`, delimiter ":", `sampleIdentifier`) and a `toolkit` description (title, author "Public Knowledge Project", version, URL). `JournalOAI::repositoryInfo()`: with a journal, `getLocalizedName()` and `getData('contactEmail')`; without, the site's `getLocalizedTitle()` and `getLocalizedContactEmail()`; sample `articleIdToIdentifier(1)`; toolkit "Open Journal Systems", `VersionDAO::getCurrentVersion()->getVersionString()`, "https://pkp.sfu.ca/ojs/". OMP `PressOAI::repositoryInfo()`: `publicationFormatIdToIdentifier(1)`, "Open Monograph Press", `getVersionString(false)`, "https://pkp.sfu.ca/omp/". OPS `ServerOAI::repositoryInfo()`: `preprintIdToIdentifier(1)`, "Open Preprint Systems", "https://pkp.sfu.ca/ops/". `PKPOAIDAO::getEarliestDatestamp()` orders the record query by `last_modified` and takes the first row's datestamp, or 0. Journal texts: `publisherInstitution` (OJS "Publisher"), `publisher` (OMP "Press Publisher Name"), `onlineIssn`, `printIssn`, `contactEmail` (U07 Fields). Live-probed 2026-09-26 (the Identify table; Settings bullet 12), all three apps: "2.0", "persistent", "YYYY-MM-DDThh:mm:ssZ", "Admin Email" the scratch context's principal contact email, the repository identifiers `ojs-test.localhost`, `omp-test.localhost` and `ops-test.localhost`, the three sample identifiers, "3.6.0.0" and the three product addresses; `<compression>` gzip and deflate in the XML, neither word on the page; "Repository Name" in French at `…/fr_CA/oai`. "Earliest Datestamp": note f-a1.

<a id="fn-e"></a>
**e** — Record selection. OJS `APP\oai\ojs\OAIDAO::getRecordsRecordSetQuery()`: `submissions` joined to their `current_publication_id` publication, `sections`, `journals`, left join `issues`; `journals.enabled = 1`, `publications.status = STATUS_PUBLISHED`, journals whose `enableOai` setting is not `1` excluded (pkp/pkp-lib#6503), journal, section, date and submission filters; datestamp `GREATEST(a.last_modified, i.last_modified, p.last_modified)`; unioned with the per-version query (note r) and the tombstone query (note n); ordered by `journal_id, submission_id, publication_id, tombstone_id`. OPS `APP\oai\ops\OAIDAO`: `submissions.status = STATUS_PUBLISHED`, the current publication's `date_published` not null, `servers.enabled = 1`, an inner join on `server_settings.enableOai = 1`; datestamp `a.last_modified`; ordered by `server_id, submission_id`. OMP `APP\oai\omp\OAIDAO`: `publication_formats` joined to the submission's current publication, `ms.status = STATUS_PUBLISHED`, `pf.is_available = 1`, `pub.date_published` not null, `presses.enabled = 1`, no `enableOai`; datestamp `ms.last_modified`; ordered by `press_id, data_object_id`. Identifiers: `JournalOAI::formatIdentifier()` "oai:{repositoryId}:article/{id}" (plus "/version/{stage}/{major}"), `PressOAI::getIdentifierPrefix()` "oai:{repositoryId}:publicationFormat/", `ServerOAI::preprintIdToIdentifier()` "oai:{repositoryId}:preprint/{id}". `record()` / `identifierExists()` restrict the lookup to the current context (`[$this->journalId]` etc.), so a context's address does not answer another context's identifier; OJS `identifierToArticleStageAndVersionMajor()` requires the exact prefix and `^(\d+)(?:/version/(AO|PMUR|VoR)/(\d+))?$`; OMP and OPS accept any identifier containing the prefix and cast the rest with `(int)` (A17). Live-probed 2026-09-26 (Rules 3, 3a, 3b, 5, 6, 15; the header table): notes q7, q9, q16.

<a id="fn-f"></a>
**f** — Dublin Core: `PKPOAIMetadataFormat_DC::toXml()` extracts `Dc11Schema` metadata through each app's adapter and writes one element per statement, `xml:lang` from the locale (`_` turned into `-`). OJS `plugins/metadata/dc11/filter/Dc11SchemaArticleAdapter::extractMetadataFromDataObject()` (at `d9b567efec`): `dc:title` `getFullTitles()` (title, ": ", subtitle; `PKPString::concatTitleFields`); `dc:creator` `getFullNames(false, true)` ("Family, Given") per author; `dc:subject` keywords then subjects, `pluck('name')`; `dc:description` the abstract (`stripAssocArray` strips tags); `dc:publisher` `publisherInstitution` else the journal's names; `dc:contributor` from `publication.sponsor` split on ";" (no such property in `schemas/publication.json`, A6); `dc:date` `datePublished` else the issue's; `dc:type` "info:eu-repo/semantics/article", the section's `identifyType` or `metadata.pkp.peerReviewed` "Peer-reviewed Article" under `Locale::getLocale()` (the default only while the stored value is null; a section saved in its window stores an empty string, A7), the publication `type`, "info:eu-repo/semantics/publishedVersion"; `dc:format` each galley's `getFileType()`; `dc:identifier` the `article/view/{bestId}` URL when `publishingMode != PUBLISHING_MODE_NONE` (or `IssueAction::subscribedUser()` of the request's user, null on OAI), then stored pub-ids (`pubIds` plugins plus `doi` when `areDoisEnabled()`; a "Publisher ID" stored as `pub-id::publisher-id` is not among them, and a DOI exists only once the journal has a "DOI Prefix"); `dc:source` "{journal name}; {issue identification}" plus "; {pages ?: articleNumber}" per locale, then the ISSNs and the issue's pub-ids; `dc:language` the galleys' `locale` as stored, such as `fr_CA` (A14), and the publication's `locale`, unique; `dc:relation` each galley's `article/view/{bestId}/{galleyBestId}` URL (same condition), galley pub-ids, the previous version (note r); `dc:coverage`; `dc:rights` `submission.copyrightStatement` "Copyright (c) {$copyrightYear} {$copyrightHolder}" when both are set, and `licenseUrl`. OPS `Dc11SchemaPreprintAdapter`: the same title, creators, subjects, description, publisher, contributor, date; `dc:type` "info:eu-repo/semantics/preprint" and "info:eu-repo/semantics/draft" only; `dc:identifier` the `preprint/view` URL always; relations when `publishingMode != NONE` (OPS stores no mode, U51 OPS1); no `dc:source`; `addLocalizedElements(…, array $localizedValues)` receives the raw abstract (OPS2). OMP `Dc11SchemaPublicationFormatAdapter`: `dc:publisher` `publisher` else the press's names; `dc:contributor` from `$monograph->getData('sponsor')` (a submission property that does not exist); `dc:type` `rt.metadata.pkp.dctype` "Book" (OMP `locale/en/locale.po`; no French text, A13) under `Locale::getLocale()` plus `type`; `dc:format` the ONIX List 150 name of the format's `entryKey`, which ends with the code, such as "(DA)"; `dc:identifier` `catalog/book/{urlPath ?? id}`, the format's pub-ids, its DOI, its identification codes; `dc:relation` the publication's pub-ids and DOI, each format file's `catalog/view/{book}/{format}/{file}`, the previous version; `dc:source` "{press name}; " plus "; {pages}"; `dc:language` `LocaleConversion::getIso3FromLocale()`; `dc:rights` the format's sales rights (`getNameForONIXCode()`); its `addLocalizedElements(…, array …)` writes empty values too and receives the raw abstract (OMP4). Publishing mode none: `Journal::PUBLISHING_MODE_NONE` (2), U51 Rule 4. "Pages" is `IssueEntryForm` `pages` ("Pages", `editor.issues.pages`); "Article Number" `submission.articleNumber`. Live-probed 2026-09-26 (the Dublin Core table; Rules 11, 11a; Settings bullets 7, 11–13): note q13.

<a id="fn-g"></a>
**g** — MARC: `OAIMetadataFormat_MARC::toXml()` / `OAIMetadataFormat_MARC21::toXml()` assign the journal, article, current publication, issue, section, `versionString` (`Repo::publication()->getVersionString()`), `versionRelation` (780, indicator 2, `$i` the previous version's string, `$o` its DOI or `article/view/{id}/version/{publicationId}`), `versionSummaryOfChanges`, `subject` (disciplines then subjects in the publication's locale, else the journal's primary locale, `pluck('name')`: pkp/ojs#5799, `3650bd2127` and `8835b97a5e`, issue pkp/pkp-lib#13280; before, each printed "Array"), `abstract` (`PKPString::html2text`), `language` (`get3LetterIsoFromLocale`), and, at `d9b567efec` (ojs `7c3d13bdb6`, pkp/ojs#5825, issue pkp/pkp-lib#12609, 2026-09-15; not in the working tree `71bb244152`), `relatedParts` = `implode(', ', array_filter([issue identification, pages ?: articleNumber]))`. Templates `marc/templates/record.tpl` (`oai_marc`, `varfield`/`subfield label`) and `marcxml/templates/record.tpl` (MARC21 slim `datafield tag`/`subfield code`): 008 `datePublished|date_format:"%y%m%d %Y"` inside literal quotes; 022 `ind1="#"`; 024 DOI (`marcxml` only); 251, 500, 780; 042 "dc"; 245 `getLocalizedTitle($journal->getPrimaryLocale())`; 100 when one author else 720, `getFullName(false, true, $publicationLocale)`, affiliations `<subfield code="u">` (ROR else name), URL and verified ORCID as `0`; 653; 520; 260 `$b` publisher, 260 `$c` issue `getDatePublished()` written `<dataField …>` in `marcxml`; 655 `identifyType`; 856 `q` file types and `u` the article URL; 773 written `<datafield id="773" i1="0" i2=" ">` with `<subfield label="t">`/`label="g"` in `marcxml` too; 546; 500 coverage; 540 copyright. A12's departures are the 773 `id`/`i1`/`label` attributes, the `dataField` element name and the `#` indicator of 022 and 024 (MARC21slim's indicator pattern is `[\da-z ]{1}`), and in `oai_marc` the affiliations' `code="u"` and 022's `label="$a"`. 008's `date_format:"%y%m%d %Y"` keeps its `%` signs (A15); 251 and 780 `$i` print `publication.versionStage.display`, which has no French text (A13). Live-probed 2026-09-26 (the MARC table; Rule 12): notes q4, q14.

<a id="fn-h"></a>
**h** — JATS: `OAIMetadataFormatPlugin_JATS` ("JATS Metadata Format", `plugins.oaiMetadata.jats.displayName`; description "Structures metadata in a way that is consistent with the JATS XML format.") overrides `getCanEnable()`/`getCanDisable()` (true) and `getEnabled()`/`setEnabled()` on its own `enabled` setting for the request's context (the site's when there is none); `getActions()` adds `settings` ("Settings") only while enabled; `manage()` `verb=settings` runs `OAIJatsSettingsForm` (template `settingsForm.tpl`: `plugins.oaiMetadataFormats.oaiJats.description`, heading `…oaiJats.settings` "Settings", checkbox `forceJatsTemplate` "Ignore uploaded JATS XML documents", `fbvFormButtons`, `common.requiredField`), saving with `createTrivialNotification()` ("Your changes have been saved."). Prefix `jats`, schema `https://jats.nlm.nih.gov/publishing/0.4/xsd/JATS-journalpublishing0.xsd`. `OAIMetadataFormat_JATS::toXml()`: for an article in an issue, `IssueAction::subscriptionRequired()` without pre-publication access or a subscribed domain → `$oaiDao->oai->error('cannotDisseminateFormat', 'Cannot disseminate format (unauthenticated access to JATS XML not allowed)')` then `exit()` (A10); `findJats()` → null → the same with "(JATS XML not available)"; `_mungeMetadata()` sets `xml:lang` (`LocaleConversion::toBcp47`), `specific-use="eps-0.1"`, a `pub-date date-type="collection"` year (the issue's shown year, else its publication year, else the version's) and removes `//email[parent::contrib or parent::corresp]` without pre-publication access (`allowedIssuePrePublicationAccess($journal, $request->getUser())`), which a signed-in Journal Manager or Section Editor has, since the page reads the session (note b); a Reader and a harvester have none. `findJats()`: unless `forceJatsTemplate`, an XML galley file (`application/xml`, `text/xml`, of a non-dependent genre) is the uploaded candidate; the `OAIMetadataFormat_JATS::findJats` hook of the "JATS Template Plugin" (`JatsTemplatePlugin::callbackFindJats()`, registered only while that plugin is enabled, U48 note u) generates the document (`Article::convertOAIToXml()`) when no candidate is left after the first is taken; `mergeJatsContent()` replaces the generated `<body>` and `<back>` with the candidate's. More than one candidate leaves one in the list and no document (the "not available" refusal). A file on the "JATS XML" page is not a candidate. Live-probed 2026-09-26 (the JATS record; the window; Rules 21, 21a, 21b, 22; Settings bullets 2–4): notes q3, q5.

<a id="fn-i"></a>
**i** — `plugins/generic/driver/DRIVERPlugin` ("DRIVER", `plugins.generic.driver.displayName`; description "The DRIVER plugin extends the OAI-PMH interface according to the DRIVER Guidelines 2.0, helping OJS journals to become DRIVER compliant."; no `settings.xml`, so off on a new journal). While enabled it hooks `OAIDAO::getJournalSets` (adds `new OAISet('driver', 'Open Access DRIVERset', '')`), `JournalOAI::records` / `::identifiers` (for `set=driver`, `DRIVERDAO::getDRIVERRecordsOrIdentifiers()` fetches the ordinary page and keeps the rows whose sets include `driver`), `OAIDAO::_returnRecordFromRow` / `_returnIdentifierFromRow` (`addSet()`), and `ArticleTombstoneManager::insertArticleTombstone` (`insertDRIVERArticleTombstone()` stores a `driver` tombstone setting). `isDRIVERRecord()` / `isDRIVERArticle()`: open when `publishingMode == PUBLISHING_MODE_OPEN` (an absent mode reads as 0), or in subscription mode when the issue is open or the article's `accessStatus` is open; restricted when `restrictSiteAccess` or `restrictArticleAccess`; a member only when open and the publication has galleys, tested as `!empty($publication->getData('galleys'))` on a `LazyCollection`, which is never empty (A23); an issue past its open access date counts as `DRIVER_ACCESS_DELAYED`, not open. `getDRIVERRecordsOrIdentifiers()` filters the ordinary page, so the answer keeps that page's `completeListSize` and resumption token (A24). `isDRIVERArticle()` calls `Repo::issue()->get($publication->getData('issueId'))` unconditionally, whose `int $id` refuses null; `Hook::call` catches the TypeError, so the unpublish goes through and only the `driver` tombstone setting is lost (A11). Live-probed 2026-09-26 (Rules 23, 23a; Settings bullets 5, 7–9): note q21.

<a id="fn-j"></a>
**j** — Sets. OJS `OAIDAO::getJournalSets()`: the journal (`JournalDAO::getAll(true)` site-wide), `setSpec($journal)` = path, name `getLocalizedName()`; each section `setSpec($journal, $section)` = "{path}:" . `OAIUtils::toValidSetSpec($section->getLocalizedAbbrev())`, name `getLocalizedTitle()`; tombstone sets not matching a live section (`DataObjectTombstoneDAO::getSets()`). `toValidSetSpec()`: `Any-Latin; Latin-ASCII; NFD; [:Nonspacing Mark:] Remove; NFC`, then removes `[^A-Za-z0-9\-_\.!~*'()]`. `getSetJournalSectionId()` returns `[0, 0]` for an unknown or foreign journal path and section id 0 for an unknown abbreviation; the query's `isset()` filters then match nothing. OPS `getServerSets()` / `getSetServerSectionId()` likewise. OMP `OAIDAO::getSets()` uses `PressDAO::getAll()` and series `setSpec` "{press path}:{series path}" (`getByPath()`); a book with no series has `series_id` null, so its record's set is the press path; `getSetPressSeriesId()` returns `[0, 0]` / series 0 for unknown values and the query tests them with truthy `when()` (OMP3). `setOAIData()` puts one set, the section's, in every live record's header. Section fields: [Sections](U17-sections.md) (its Settings bullets 11, 12 and note td16: live-probed 2026-09-25, "each section was a harvesting set '{journal}:{abbreviation}' named by its title", the typed "Identify items…" appeared as an extra resource type on OJS). OMP names a series set by its prefix and title joined by a space (OMP6); the section `setSpec` reads the abbreviation in the request's locale (A21). A deleted section's set is listed from the tombstones, but `getSetJournalSectionId()` finds no live section by its abbreviation, so asking for it matches nothing (A19). Live-probed 2026-09-26 (Rules 7, 7a–7d, 8): note q10.

<a id="fn-k"></a>
**k** — Paging: `listIdentifiers()` / `listRecords()` / `listSets()` return at most `maxIdentifiers` / `maxRecords` / `maxRecords` items; while `offset < total` they save a token (`PKPOAIDAO::insertToken()`, an md5 id, the offset and serialized parameters, `expire = time() + tokenLifetime`) and print `<resumptionToken expirationDate completeListSize cursor>`; the answer that completes a resumed list prints an empty `<resumptionToken completeListSize cursor/>`. `resumptionToken()` first deletes expired tokens (`clearTokens()`), then looks the token up; missing → `badResumptionToken`. The XSLT's `oai:resumptionToken` template prints "There are more results." and the "Resume" link for every token element, the empty one included (A4). Live-probed 2026-09-26 (Rule 13; A4): note q15.

<a id="fn-l"></a>
**l** — Dates: `OAI::extractDateParams()` → `OAIUtils::UTCtoTimestamp()`: `^\d\d\d\d-\d\d-\d\d$` or `^(…)T(\d\d:\d\d:\d\d)Z$`, then `strtotime("{date} UTC")`, returning "invalid" only for a non-matching string (a `false` from `strtotime` passes as `false`, A3; PHP rolls "2026-02-30" over); `from > until` and differing lengths are refused; a day-only `until` gets `+ 86399`. The DAOs filter with `whereDate(column, '>=' | '<=', DateTime::createFromFormat('U', …))`, which compares dates only (A2). OPS `until` filters `whereDate('a.last-modified', …)`, a column that does not exist (OPS1). Live-probed 2026-09-26 (Rules 9, 9a–9d): note q11.

<a id="fn-m"></a>
**m** — `OAI::error($code, $message)`: for `badVerb` and `badArgument` the `<request>` element carries no attributes; for the others it repeats the request's parameters. "Multiple values are not allowed for the {argument} parameter" is never reached: `OAIUtils::parseStr()` makes a repeated key an array, and `OAI::getParam()`, typed `?string`, throws a TypeError before `checkParams()` can refuse it (A16). Messages as in the table, from `OAI.php` and `OAIMetadataFormat_JATS.php`. `listSets()` answers `noSetHierarchy` "This repository does not support sets" when no set exists, which a site with a journal never meets. `listMetadataFormats()` answers `noMetadataFormats` "No metadata formats are available" when no format plugin is enabled, which cannot happen (the DC format cannot be disabled). Live-probed 2026-09-26 (Errors; Rules 2, 14), all three apps, 35 refusals each: notes q15, q16, f-a16.

<a id="fn-n"></a>
**n** — Deleted records (tombstones, `data_object_tombstones` with their set objects). OJS `ArticleTombstoneManager`: `reconcileTombstonesOnUnpublish()` (from `Repo::publication()->unpublish()`, `delete()` of a published publication, and `IssueGridHandler::deleteIssue()`) inserts the bare identifier's tombstone when no published version is left; `reconcileTombstonesOnPublish()` deletes it; `IssueGridHandler::unpublishIssue()` unpublishes and re-publishes each article into the now-unpublished issue (status scheduled), leaving the tombstone; `insertTombstonesByContext()` / `deleteTombstonesByContextId()` on `enabled` changes and before a context is deleted. OPS `Repository::updateStatus()` inserts a `PreprintTombstoneManager` tombstone when the submission leaves `STATUS_PUBLISHED` and deletes it when it returns. OMP `PublicationFormatTombstoneManager`: on `unpublish()` for each format of the version, on a format's "Format Availability" or approval change (`PublicationFormatGridHandler::setAvailable()` / `setApproved()`), deleted on publish. The tombstone query (note e) joins the context's set objects with `->when(isset($journalId), function ($query, $journalId) { … use ($journalId) … (int) $journalId })` in OJS and `->when(isset($pressId), function ($query, $pressId) …)` in OMP: Laravel passes the condition (`true`) as the closure's second argument, so the join asks for context 1 (A1); OPS writes `function ($query) use ($serverId)`. Without a context (site-wide) no join applies; with a `set`, the site-wide query takes the journal's filter and loses its deleted records the same way (A1). The site-wide union lists the tombstones after every context's live rows (Rule 6); at an OMP press's own address the first press's tombstones, which carry its `press_id`, sort before the press's own rows (2026-09-29, note q8). A context removed under Hosted Journals leaves its tombstones on OJS and OMP and none on OPS (OPS4). On OMP and OPS, unpublishing, publishing again and saving a published version leave `submissions.last_modified` where it was (read in the database, A18). Live-probed 2026-09-26 (Rules 4, 4a, 4b, 16b; Side effects): notes q8, q17, f-ops4.

<a id="fn-o"></a>
**o** — OJS `classes/components/forms/context/AccessForm.php` and OPS's: `FieldOptions('enableOai', type radio, options true "Enable" (`common.enable`) / false "Disable" (`common.disable`))`, label `manager.setup.enableOai` "Enable OAI", description `manager.setup.enableOai.description` (the Open Archives Initiative link). `schemas/context.json` `enableOai` boolean, `default: 1`, so a new context gets the row; the tab posts `enableOai=true` untouched (scenarios.md, the `publishingMode` key). OMP has no `enableOai` in its schema or forms and no "Access" tab (U51 note b). Live-probed 2026-09-26 (the "Enable OAI" field; Actors row 3; Rules 17, 17a; Settings bullet 1), OJS and OPS, two runs: notes q6, q18.

<a id="fn-p"></a>
**p** — Plugins list: `PluginGridCellProvider` column `enabled`: `selected` = `getEnabled()`, `disabled` = enabled ? `!getCanDisable()` : `!getCanEnable()`; `Plugin` defaults `getCanEnable()`/`getCanDisable()` false and `getEnabled()` true, which `OAIMetadataFormatPlugin` (DC, MARC, MARC21) does not override. Category label `plugins.categories.oaiMetadataFormats` "OAI Metadata Format Plugins" ("These format plugins express metadata in OAI communications."). Display names: `plugins.oaiMetadata.dc.displayName` "DC Metadata Format", `plugins.OAIMetadata.marc.displayName` "MARC Metadata Format", `plugins.OAIMetadata.marcxml.displayName` "MARC21 Metadata Format", "JATS Metadata Format". Prefixes and schemas: `oai_dc` `http://www.openarchives.org/OAI/2.0/oai_dc.xsd`; `oai_marc` `http://www.openarchives.org/OAI/1.1/oai_marc.xsd`; `marcxml` `https://www.loc.gov/standards/marcxml/schema/MARC21slim.xsd`; `jats` (note h). `OAIMetadataFormatPlugin::register()` hooks `OAI::metadataFormats` only while enabled; `OAI::metadataFormats()` ignores the identifier. The "Metadata Plugins" category also lists "Dublin Core 1.1 metadata" (`PKPDc11MetadataPlugin`), the schema the DC format reads, its box ticked and disabled. Seed facts (U48 claim check, 2026-09-25): "JATS Metadata Format" unticked on a new journal and on `publicknowledge`. Live-probed 2026-09-26 (Actors row 4; the formats table; Rule 10; Settings bullet 2): notes q2, q12.

<a id="fn-r"></a>
**r** — Versions (OJS). `OAIDAO::getRecordsRecordSetQuery()` treats journals with `doiVersioning = 1` and `enableDois = 1` (`Context::SETTING_DOI_VERSIONING`, `SETTING_ENABLE_DOIS`) apart: their records come from a second query over every published publication of stage `AO`, `PMUR` or `VoR` (`APP\publication\enums\VersionStage`), the latest minor per stage and major; `setOAIData()` gives the current publication the bare identifier and the others `/version/{stage}/{major}`, pointing the submission's `currentPublicationId` at the rendered version. `JournalOAI::versionToPublicationId()` resolves a versioned identifier. `ArticleTombstoneManager` tombstones and restores versioned identifiers as versions are unpublished and published. DOI tab: `PKPDoiSetupSettingsForm` `enableDois` ("Allow Digital Object Identifiers (DOIs) to be assigned to work published in this journal."), `doiVersioning` "DOI Versioning" with "Yes, assign a unique DOI to every version of an article." / "No, all versions of an article should have the same DOI." (a null setting shows "No" on OJS). Relation: `Repo::publication()->getVersionRelation()` (the immediately preceding published version; its DOI URL when versioning gives it a different DOI, else the `article/view/{id}/version/{publicationId}` URL, OJS and OPS only when the address is included; OMP `catalog/book/{id}/version/{publicationId}`). While any journal has both settings on, the per-version union makes the record query fail on the test database (A22), so Rules 20 and 20a rest on this reading: a second major version published on screen got its own DOI, and after its "Unpublish" the database held one tombstone, for `…/version/VoR/1` (Rule 20a); publishing it again removed that tombstone. A new journal stores `enableDois` 1, "Articles" ticked and no prefix. Live-probed 2026-09-26 (Rules 20, 20a, 20b; Settings bullet 6): note q20.

<a id="fn-s"></a>
**s** — Seeding for the scenarios. Each scenario runs on its own scratch contexts from `POST scenarios/context` (`docs/process/scenarios.md`), with throwaway `users[]` (password: the username twice, `docs/process/users.md`): an `author` (`givenName` "Ada", `familyName` "Author") who submits every item, and a `manager` (the Journal Manager, Press Manager or Preprint Server Manager) in scenarios 3, 7 and 9; scenario 6's Site Administrator is the installer's `admin`. The visitor is a signed-out browser context of its own; the suites read the raw XML through a request (`page.request`) in a fresh request context, following redirects, and open the rendered page only for the browser-view checks (scenario 1's "The browser view", the Login pages of scenario 6). Items come from `POST scenarios/submission` by the `author` with `published: true` and no `datePublished` (so every record's datestamp and "Date" are the day of the run, UTC by the suites' configuration); galleys are `galleys: [{label: 'PDF', file: 'article.pdf'}]` on OJS and `preprint.pdf` on OPS; a press's format is `publicationFormats: [{name: 'PDF', file: 'article.pdf'}]`. A first section's `abbrev` is given as a bare string (a locale map stores "Array", scenarios.md). The OAI requests are typed addresses; the unpublish, the second publish, "Enable OAI", the plugin ticks, the JATS window and the Hosted Journals window are the screens'. Scenario 1: context `name` "Sea Letters", `contactName` "Pat Contact", `contactEmail` "pat.contact@example.org", `sections: [{abbrev: 'ART', title: 'Articles'}]` (OPS `{abbrev: 'PRE', title: 'Preprints'}`), on OJS `issues: [{volume: 1, number: 2, year: 2026}]` (unpublished); "Tidal Patterns" (`abstract` "Tides follow the moon.", OJS and OPS `keywords: ['tides', 'moon']`, published with its galley; OMP `publicationFormats: [{name: 'PDF', file: 'article.pdf'}, {name: 'EPUB'}]`, and "Bare Book" published with no `publicationFormats`); "Draft Study" `submitted: true`, not published; on OJS "Future Tides" `published: true` with `issue` Vol. 1 No. 2 (2026), which schedules it; a second context with "Elsewhere" published. The "Repository Identifier" is the install's (`ojs-test.localhost`, `omp-test.localhost`, `ops-test.localhost`, `config.test.inc.php`). Scenario 2: contexts "Sea Letters" with "Tidal Patterns" and "Hill Notes" with "Mountain Air", each one-language; the site's languages and its empty "Site Name" are the test install's (seed-facts). Scenario 3: "Tidal Patterns", then "Coral Reefs", published (OMP each with the one format); the unpublish and the second publish by the `manager` on the workflow screen. Scenario 4: "Sea Letters" with "Tidal Patterns" published; on OPS a second context "Empty Shelf" with nothing. Scenario 5: OJS and OPS `sections: [{abbrev: 'ART', title: 'Articles'}, {abbrev: 'REV', title: 'Reviews'}]`, "Tidal Patterns" (`section: 'ART'`) seeded and published before "Hill Review" (`section: 'REV'`); OMP two books, no series; "today", "tomorrow" and "yesterday" are UTC dates. Scenario 6: "Sea Letters" with "Tidal Patterns"; "Hill Notes" with `restrictSiteAccess: true` and "Mountain Air". Scenario 7 (OJS, OPS): "Tidal Patterns" and "Coral Reefs" published; the `enableOai` key is not used, the tab is driven. Scenario 8 (OJS): `sections: [{abbrev: 'ART', title: 'Articles', identifyType: 'Research Article'}]`, `issues: [{volume: 1, number: 2, year: 2026, published: true}]`; "Tidal Patterns" with `subtitle` "A Study", the abstract, `disciplines: ['Marine Science']`, `subjects: ['Oceanography']`, `articleNumber: 'e0142'`, its galley and that `issue`; "Loose Notes" published with no `issue`. Scenario 9 (OJS): "Tidal Patterns" with its PDF galley and "Marked Tides" with `galleys: [{label: 'XML', file: 'article.xml'}]` (the JATS fixture as an XML galley), both in no issue; no `plugins` key, so "JATS Metadata Format" is off and "JATS Template Plugin" on, as on every new journal (seed-facts). Scenario 10 (OJS): "Paid Letters" with `publishingMode: 'subscription'`, `plugins: {oaimetadataformatplugin_jats: {enabled: true}, driverplugin: {enabled: true}}` ("DRIVER" by its class name, lowercased) and `issues: [{volume: 1, number: 1, year: 2026, published: true, accessStatus: 'open'}, {volume: 1, number: 2, year: 2026, published: true}]` (an issue published under subscriptions is "Subscription"); "Open Tides" into the first issue, "Closed Tides" and "Opened Tides" (`accessStatus: 'open'`) into the second, each with its galley; "Print Letters" with `publishingMode: 'none'` and "Paper Tides" published with its galley. `publicknowledge` is never read: it has no published item on a fresh fleet, and on a used fleet the suites publish into it and it holds deleted records on every app (on OMP a format set "Not Available" leaves one), which every OJS journal's and OMP press's own lists show (A1), so no scenario asserts a journal's unfiltered list to be complete or empty. No scenario seeds `doiVersioning: true`: while any OJS journal has "DOI Versioning" on, every OJS OAI read fails (A22), and the three suites share one install. A context with more than one language answers its plain address with a redirect and the app remembers the last language a browser asked for, hence the fresh request context. The mail catcher is not read: nothing is emailed (Side effects). Live-probed 2026-09-26 (the preamble): every probe of this spec ran this way, all three apps; a signed-in staff browser reads a different `jats` answer from a harvester's (Actors), so the visitor stays signed out.

<a id="fn-t"></a>
**t** — Configuration `[oai]` (`config.TEMPLATE.inc.php`): `oai = On` ("Enable OAI front-end to the site"), `repository_id` ("OAI Repository identifier. This setting forms part of OAI-PMH record IDs. Changing this setting may affect existing clients and is not recommended."), `oai_max_records = 100`. The installer (`lib/pkp/templates/install/install.tpl`, `InstallForm`) asks "Repository Identifier" under "OAI Settings", default `{application}.{server host}`. Off: OJS and OPS `OAIHandler::validate()` redirect to the context's (site's) `index`; OMP `authorize()` returns false → `handleAuthorizationFailure()` (Login signed out, else `user/authorizationDenied`). The test installs run with `oai = On`, `repository_id` `ojs-test.localhost` / `omp-test.localhost` / `ops-test.localhost`, `oai_max_records = 100`; PRINCIPLES D9 forbids editing the running configuration, and the validation-variant server (harness.md) flips no OAI key, so the interface's off end (Rule 24; Actors row 1's condition) is read from the code. Live-probed 2026-09-26 (Settings bullet 14; Rule 24's last sentence), all three apps: Administration › "System Information" lists the group "oai" with "oai" 1, "repository_id" and "oai_max_records" 100, read-only; no settings page of a context, nor Site Settings, Hosted Journals or the Administration index, carries an OAI switch.

<a id="fn-u"></a>
**u** — Language: every localized value is written per locale (`addLocalizedElements`), `xml:lang` from the locale key. `Locale::getLocale()` (the request's locale: the URL's segment, pkp/pkp-lib#13124) decides `getLocalizedName()` (Repository Name, journal set names), `getLocalizedAbbrev()` and `getLocalizedTitle()` (section sets) and the `metadata.pkp.peerReviewed` / `rt.metadata.pkp.dctype` words. Upstream sync (rr4, 2026-09-10/11, the pkp/pkp-lib#12375 matrix on the three apps): the bare OAI address answered one hop to `/en/`, and `/en/` and `/fr_CA/` answered in place, without a cookie. The app keeps the last language segment of a request in a `currentLocale` cookie and sends the bare address there next time (Rule 19a). Live-probed 2026-09-26 (Rules 19, 19a; the two addresses): note q19.

<a id="fn-q1"></a>
**q1** — Live-probed 2026-09-26 (Actors preamble, rows 1–3; Rule 18), all three apps, two runs each: on a scratch context the signed-out answer and the Journal (Press, Preprint Server) Manager's, the Reader's and the Section Editor's were the same apart from the response date. With "Users must be registered and log in to view the journal site." ticked and saved on screen, a signed-out ListRecords or ListSets answered 302 to `{journal}/login?source=…`; signed in as the Manager, the Editor (OJS, OMP), the Section Editor, the Author, the Reader, the Site Administrator or a user with no role in that journal, the list answered. On a context created not enabled, signed out went to `{journal}/login`; signed in, every level got "No matching records in this repository" (OJS: the first journal's deleted records), while ListSets and Identify named the context. The Manager, the Editor and the Site Administrator opened Settings › Distribution; the Section Editor, the Author, the Reader and an Editor whose role had "Permit changes to Settings" unticked (OJS, OMP) got "The current role does not have access to this operation.".

<a id="fn-q2"></a>
**q2** — Live-probed 2026-09-26 (Actors row 4; the formats table), all three apps: under "OAI Metadata Format Plugins" OJS lists "MARC Metadata Format", "MARC21 Metadata Format" and "DC Metadata Format" ticked and disabled, and "JATS Metadata Format" unticked; OMP and OPS list "DC Metadata Format" alone, ticked and disabled. A click on a disabled box does nothing and sends no request. OJS lists "DRIVER" under "Generic Plugins", unticked; OMP and OPS have no such row. "Dublin Core 1.1 metadata" is listed under "Metadata Plugins", ticked and disabled, on the three apps. The Section Editor, the Author and the Reader were refused Settings › Website.

<a id="fn-q3"></a>
**q3** — Live-probed 2026-09-26 (Actors row 5; the window; Settings bullet 2), OJS, two runs: ticking "JATS Metadata Format" asked nothing and showed 'The plugin "JATS Metadata Format" has been enabled.'; the row's arrow then offered "Settings" alone. The window read as the Fields section quotes it, its box unticked. Ticked and "OK": "Your changes have been saved.", the window closed and reopened ticked (`forceJatsTemplate` 1). Unticked and "Cancel": no question, the change dropped. The window's "Close" with the box changed raised the browser question "The data on this form has changed. Do you wish to continue without saving?"; dismissed, the window stayed open. Unticking the plugin asked "Are you sure you want to disable this plugin?" and removed "Settings".

<a id="fn-q4"></a>
**q4** — Live-probed 2026-09-26 (A12), OJS: `xmllint --schema` with MARC21slim.xsd (the Wayback Machine's copy; loc.gov answers a challenge page) on two `marcxml` records refused 022's indicator "#", the `dataField` element, 773's `id`, `i1`, `i2` and `label` (and its missing `tag`, `ind1`, `ind2`, `code`), and 024's `ind2` "#". The `oai_marc` record writes the 100 and 720 affiliations as `<subfield code="u">` and 022's subfield as `label="$a"`.

<a id="fn-q5"></a>
**q5** — Live-probed 2026-09-26 (the JATS record; Rules 21, 21a, 21b, 22; A10), OJS, two runs: (1) unticked, ListMetadataFormats listed `oai_marc`, `marcxml`, `oai_dc` and every `jats` request answered "The requested metadataPrefix is not supported by this repository"; ticked, `jats` came first; unticked again, gone; (2) signed out, GetRecord in `jats` gave a JATS `<article>` with `xml:lang` ("fr-CA" for a French submission), `specific-use="eps-0.1"`, the title, a `pub-date` of type "collection" with the issue's year (2024 for an issue of 2024 published in 2026; the publication year with no issue) and no `<email>`; a signed-in Journal Manager's or Section Editor's browser kept the contributors' emails; (3) an article with the XML galley fixture carried the fixture's body and back matter; with "Ignore uploaded JATS XML documents" ticked its body became the galley's whole text in one paragraph and the back matter went; a file on the "JATS XML" page, not a galley, gave no body; (4) "JATS Template Plugin" disabled: every `jats` GetRecord and ListRecords answered "Cannot disseminate format (JATS XML not available)" while ListMetadataFormats kept `jats`; (5) on a subscription journal, GetRecord of an article in a subscription issue, and the whole ListRecords, answered only "Cannot disseminate format (unauthenticated access to JATS XML not allowed)", the open-issue article sorted first lost too; so did an article marked "Open Access" in that issue; one in an issue past its open access date and one in no issue were served; ListIdentifiers in `jats` listed the restricted article; the journal's Reader signed in got the refusal, its Journal Manager and Section Editor the records.

<a id="fn-q6"></a>
**q6** — Live-probed 2026-09-26 (the "Enable OAI" field; Actors row 3; Settings bullet 1), OJS and OPS, two runs: a new journal and preprint server open the "Access" tab with "Enable" chosen, after "Publishing Mode" (none of its three choices chosen) on a journal and "Posting Mode" on a preprint server; the help "Provide metadata to third-party indexing services through the Open Archives Initiative." links "Open Archives Initiative" to `https://www.openarchives.org/`. "Disable" and "Save" showed "Saved" inline, no page notice, and the tab reopened with "Disable" after a reload; the save stored `enableOai` alone. A changed "Enable OAI" left by leaving the page was dropped with no question. OMP, as the Press Manager, the Press Editor and the Site Administrator: Settings › Distribution has the tabs "License", "DOIs", "Search Indexing", "Payments", "Statistics", and no settings page carries "Enable OAI".

<a id="fn-q7"></a>
**q7** — Live-probed 2026-09-26 (Rules 3, 3a, 3b; OMP1), all three apps: a scratch journal listed its published articles, each with its current version's title, and not one in the workflow, one scheduled in an unpublished issue (OJS), a declined one or a second journal's; a newer unpublished version's title did not reach the record. A press listed one record per available format (two for a two-format book), none for a book published with no format; a preprint server listed its posted preprints only.

<a id="fn-q8"></a>
**q8** — Live-probed 2026-09-26 (Rules 4, 4a, 4b; A1), all three apps, two sweep runs: "Unpublish" ("Unpost") on the workflow screen, and on OJS "Unpublish Issue" and "Delete" of a published issue, left at the site-wide address a record with the same identifier, a deleted header, the datestamp of the action, its set and no metadata, with "This record has been deleted." on the page; published again ("Schedule For Publication", "Publish", "Post"), the record was back with the same identifier. After "Unpublish" the workflow offered no "Delete" on any app. At the scratch journal's (press's) own address the deleted record was missing and GetRecord answered "No matching identifier in this repository" (OJS, OMP); OPS listed it at the server's address. OJS journals' own lists carried the three deleted records of `publicknowledge`, the install's first journal, and GetRecord at a scratch journal answered one of them; with a `set` (the journal's path, a section's, `nosuchset`, `publicknowledge`) its lists left them out; OPS showed none of them. The site-wide `set={journal path}` left the journal's deleted records out on OJS and OMP and listed them on OPS. 2026-09-29 (Rules 4b, 6, 15; A1), OMP and OPS, two runs, `publicknowledge` restored after each: with the only format of a `publicknowledge` book set "Not Available", an empty scratch press listed that deleted record in ListRecords and ListIdentifiers (setSpec `publicknowledge`, "This record has been deleted." on the page), answered it by GetRecord and gave its datestamp as "Earliest Datestamp", while its ListSets named only itself; a press with one published book listed it before its own record; with `set` of the press it was left out, and the empty press answered "No matching records in this repository" and the moment of the request before the format was changed and after the book was unpublished. OPS, with a `publicknowledge` preprint unposted, answered "No matching records in this repository" at an empty scratch server and "No matching identifier in this repository" for the preprint's identifier. OJS, with no deleted record on the install, answered "No matching records in this repository" and the moment of the request at an empty scratch journal. A format set "Not Available" in "Format Availability" became a deleted record; unpublishing a two-format book made two.

<a id="fn-q9"></a>
**q9** — Live-probed 2026-09-26 (Rules 5, 6; A18), all three apps: a context lists by submission ID (OJS, OPS) or format number (OMP). OJS: an article's datestamp moved when its issue's "Number" was saved on "Issue Data", when "Prefix" was saved on its published version, and to the moment it was published again. OMP and OPS: the datestamp did not move after "Prefix" was saved on the published version, and an item published again came back with its first datestamp, older than its deleted record's (twice on each app). The site-wide ListIdentifiers, walked in full, listed the contexts one after another and every deleted record at the end (OJS 741 headers, the deleted ones at 728–740).

<a id="fn-q10"></a>
**q10** — Live-probed 2026-09-26 (Rules 7, 7a–7d, 8; OMP3, OMP6, A19), all three apps: ListSets named the context by its name and each section "{path}:{abbreviation}" by its title; "É D" listed as "{path}:ED", and `set={path}:ED` listed its article; each header named one set. OMP: series "{press path}:ser1" named " Series One" (a leading space; no prefix), a book in no series in the press's set only. A section deleted on Settings › Sections while it held a deleted record stayed listed under its old name, and asking for it answered "No matching records in this repository" at both addresses (OJS, OPS); once the record was published again, the set was gone. `set` with another journal's path, `nosuchset` or "{path}:NOPE" answered "No matching records in this repository" on OJS and OPS. OMP: an unknown series after the press's path listed all the press's records; another press's path, an unknown path or another press's series listed the records of every press; at the site-wide address another press's path listed that press's records.

<a id="fn-q11"></a>
**q11** — Live-probed 2026-09-26 (Rules 9, 9a–9d; A2, A3, A20, OPS1), all three apps, two runs of the dates: `from` today listed today's records, tomorrow none; `until` yesterday none, today all; `from=…T23:59:59Z` and `until=…T00:00:00Z` listed records changed that day at other times; `from=2026-13-01` listed as with no date and `until=2026-13-01` nothing; `from=…T25:00:00Z` listed as with no date; "2026-09-31" rolled into October; `from=26-09-2026` and `until=2026/09/26` answered the "Illegal" messages; `from` after `until` and mixed granularity answered the two ordering messages. OPS: every list with `until` failed with a server error at the server's and the site-wide address; OJS and OMP answered. `set=publicknowledge:ART` (OPS `:PRE`) with `from=2030-01-01` listed that section's deleted records of the day, at both addresses (OJS, OPS; OMP not reached).

<a id="fn-q12"></a>
**q12** — Live-probed 2026-09-26 (Rule 10), all three apps: with an `identifier` of a held record, ListMetadataFormats gave the same list as without; an identifier the address does not hold answered "No matching identifier in this repository". ListRecords, ListIdentifiers and GetRecord in `marcxml` or `oai_marc` on OMP and OPS answered "The requested metadataPrefix is not supported by this repository".

<a id="fn-q13"></a>
**q13** — Live-probed 2026-09-26 (the Dublin Core table; Rules 11, 11a; A6, A7, A8, A14), all three apps, on an item with a title and subtitle in English and French, two contributors, keywords "tides" and "moon", a subject, a discipline, a supporting agency, an abstract with bold and italic, a PDF galley and "Coverage" "Pacific": every row as the table gives it, each language once with `xml:lang` "en" or "fr-CA"; no "Array"; the discipline not in the Dublin Core record; no "Supporting Agencies", "Rights" or "Source" words in any record. "Publisher": the journal's name in both languages until "Publisher" was typed on "Masthead", then that alone; OMP the "Press Publisher Name". "Resource Type": OJS "Peer-reviewed Article" only for a section never saved in its window, the typed "Identify items…" words, the version's "Type"; OMP "Book" and the "Type"; OPS the two eu-repo words. OMP "Format" "Digital (on physical carrier) (DA)". OJS: a "Publisher ID" saved on the Metadata page was not written. "Source" "{journal}; Vol. 1 No. 2 (2026); e0142", "Pages" "15-20" winning over the "Article Number", "{journal}; " for an article in no issue. "Language" "en", and "fr_CA" for a French galley (OJS, OPS); OMP "eng". "Rights Management" the copyright line and, once a license was saved, its address; OMP the format's sales rights. On a journal set to "OJS will not be used to publish the journal's contents online.", only the DOIs stayed under "Resource Identifier" and "Relation".

<a id="fn-q14"></a>
**q14** — Live-probed 2026-09-26 (the MARC table; Rule 12; A12, A15), OJS: both formats carry the same fields and 042 "dc"; 008 read "%26%09%26 %2026" in every record; 022 the two ISSNs; 024 the DOI in `marcxml` only; 251 "Version of Record 1.0"; 500 the "Summary of Changes (Amendment Notice)" as `<p>…</p>`; 780 the previous version by its address, and none while only a minor version followed the first; 245 the title without the subtitle; one contributor under 100, two under 720, with the affiliation's name or ROR address, the URL and a verified ORCID iD (an unverified one not written); 653 the discipline then the subject; 260 the publisher and, in an issue, the issue's date; 655 the section's typed words; 856 the file type and the article page; 773 "Vol. 1 No. 2 (2026), e0142" and "…, 15-20"; an article in no issue has no issue part in 773 and no date in 260. OMP and OPS refuse both formats.

<a id="fn-q15"></a>
**q15** — Live-probed 2026-09-26 (Rule 13; Errors; A4), all three apps: `resumptionToken=abc` answered "The requested resumptionToken is invalid or has expired", and beside `metadataPrefix` "metadataPrefix is an illegal parameter". ListRecords paged by 100 (OJS: 513 records in 6 parts), ListIdentifiers by 500, ListSets by 100; each token answered the next part alone, the last part's token was empty, and its page still read "There are more results." with a "Resume" that answered the error; `expirationDate` was 24 hours after the response. Every refusal of the table was followed by an ordinary answer to the next request.

<a id="fn-q16"></a>
**q16** — Live-probed 2026-09-26 (Rule 15; Errors; A1, A17), all three apps: at a scratch context, GetRecord of a second context's item, of an unpublished item and of no item answered "No matching identifier in this repository"; the site-wide address answered both contexts' items. OJS: `…:article/abc`, `…/654abc`, `foo` and another repository identifier answered "Identifier is not in a valid format"; OMP and OPS answered it only without their own start, and after it `abc` answered "No matching identifier in this repository" and `390abc` record 390.

<a id="fn-q17"></a>
**q17** — Live-probed 2026-09-26 (Rules 16, 16a, 16b), all three apps, two runs: the site-wide Identify's "Repository Name" was empty with the site's "Site Name" empty, and "Admin Email" followed "Email of principal contact" when it was changed on Site Settings › "Information" (restored afterwards). The site-wide lists held every enabled context's live records; a journal (server) with "Enable OAI" at "Disable" was still named in ListSets with its sections, one unticked publicly or created not enabled was not. Unticked under Hosted Journals › "Edit", a context's items read as deleted at the site-wide address and its set answered "No matching records in this repository"; ticked again, they were live with the same identifiers. `{site address}/index.php/nosuchjournal/oai?verb=Identify` answered "404 Not Found" on the three apps.

<a id="fn-q18"></a>
**q18** — Live-probed 2026-09-26 (Rules 17, 17a), OJS and OPS, two runs: with "Disable" saved on screen, GetRecord and ListMetadataFormats with the published item's identifier answered "No matching identifier in this repository", while Identify, ListSets and ListMetadataFormats answered. The deleted item stayed listed at the site-wide address on both apps and at the server's own address on OPS, whose "Earliest Datestamp" moved to the deleted record's; OJS's own lists showed the first journal's deleted records, and `set={journal}` answered "No matching records in this repository". "Enable" saved again, the same identifiers came back at both addresses.

<a id="fn-q19"></a>
**q19** — Live-probed 2026-09-26 (Rules 19, 19a; A13, A21), all three apps: a fresh browser's `{journal address}/oai` answered 302 to `…/en/oai`, and "Base URL" and "Request URL" read that address; after one request at `…/fr_CA/oai` the same browser's plain address went to `…/fr_CA/oai`. At `…/fr_CA/oai`: "Repository Name" and the set names in French, "Article évalué par les pairs" for a section never saved in its window, a section with the French abbreviation "ARTF" (OPS "PREF") listed as "{path}:ARTF", and OMP's "Resource Type" "##rt.metadata.pkp.dctype##".

<a id="fn-q20"></a>
**q20** — Live-probed 2026-09-26 (Rules 20, 20a, 20b; Settings bullet 6; A22), OJS: a new journal had DOIs on, "Articles" ticked, no "DOI Prefix" and "No, all versions of an article should have the same DOI.". Without a prefix no DOI reached the record; with one, the DOI was in "Resource Identifier" and `marcxml` 024, not in `oai_marc`. With "DOI Versioning" at "Yes, …" saved on screen, every list, record and Identify request at that journal, a second journal and the site-wide address answered a server error with an empty page (ListSets answered), before and after a second major version was published, which got its own DOI; set back to "No", they answered again. On a journal without versioning, versions 1.0 and 2.0 gave one record, `…/version/VoR/1` answered "No matching identifier in this repository", and "Relation" and MARC 780 named 1.0 by its address.

<a id="fn-q21"></a>
**q21** — Live-probed 2026-09-26 (Rules 23, 23a; A11, A23, A24), OJS, two runs: "DRIVER" ticked on screen asked nothing and showed 'The plugin "DRIVER" has been enabled.'; ListSets added `driver` "Open Access DRIVERset". On an open journal an article with a galley and one with none were both members, each header naming "driver". On a subscription journal an article in an open issue and one marked "Open Access" in a subscription issue were members; one in a subscription issue, one past its open access date and one in no issue were not. "Users must be registered and log in to view open access content." (and the site box) ticked emptied the set; unticked, the members were back. `set=driver` said "There are more results." with "completeListSize" 5 for two members, and "Resume" returned the same two again. An article in no issue unpublished with the plugin on showed "Status: Unscheduled" and "Schedule For Publication", its page answered 404 signed out, and its deleted record carried no `driver` mark. No deleted record was listed in the set, and the site-wide address had no `driver` set.

<a id="fn-f-a1"></a>
**f-a1** — Live-probed 2026-09-26 and, on OMP, 2026-09-29: note q8. "Earliest Datestamp": OJS scratch journals with and without published items all gave 2026-09-26T05:20:08Z, a deleted record of `publicknowledge`; OMP gave the moment of the request, for an empty press and for one whose only book was unpublished, while `publicknowledge` held no deleted record; with one, the empty press gave that record's datestamp (2026-09-29); OPS gave the deleted record's datestamp. Code: note n; the OJS closure dates from `88aaa6b49f` "pkp/pkp-lib#7129 Issue EntityDAO refactor" (2021-07-14), OMP's from the 2021 Laravel port (`79302a1bd`, 2021-06-15). The test installs' first context is `publicknowledge`.
Issue report: [pkp-e2e#254](https://github.com/jardakotesovec/pkp-e2e/issues/254) ([docs/issues/U19-A1-oai-own-address-loses-deleted-records.md](../issues/U19-A1-oai-own-address-loses-deleted-records.md)).

<a id="fn-f-a2"></a>
**f-a2** — Live-probed 2026-09-26: note q11, the reads with a time. Code: note l.
Issue report: [pkp-e2e#300](https://github.com/jardakotesovec/pkp-e2e/issues/300) ([docs/issues/U19-A2-oai-from-until-ignore-time-of-day.md](../issues/U19-A2-oai-from-until-ignore-time-of-day.md)).

<a id="fn-f-a3"></a>
**f-a3** — Live-probed 2026-09-26: note q11, `2026-13-01` as `from` and `until`, "2026-02-30", `T25:00:00Z` and the roll-over of "2026-09-31". Code: note l.
Issue report: [pkp-e2e#301](https://github.com/jardakotesovec/pkp-e2e/issues/301) ([docs/issues/U19-A3-oai-impossible-date-accepted.md](../issues/U19-A3-oai-impossible-date-accepted.md)).

<a id="fn-f-a4"></a>
**f-a4** — Live-probed 2026-09-26: note q15, the last part of each list. Code: note k.
Issue report: [pkp-e2e#303](https://github.com/jardakotesovec/pkp-e2e/issues/303) ([docs/issues/U19-A4-oai-browser-last-part-says-more-results.md](../issues/U19-A4-oai-browser-last-part-says-more-results.md)).

<a id="fn-f-a5"></a>
**f-a5** — Live-probed 2026-09-26, all three apps: "formats" on a record's header opened ListMetadataFormats with the identifier, which read "This is a list of metadata formats available from this archive." and linked each prefix to the whole archive's records. Code: `oai2.xsl` sets `$identifier` from the text of `oai:request` after "identifier=", but that text is the base URL (the arguments are attributes), so the "for the record" branch never shows.
Issue report: [pkp-e2e#304](https://github.com/jardakotesovec/pkp-e2e/issues/304) ([docs/issues/U19-A5-oai-browser-record-formats-shown-as-archive.md](../issues/U19-A5-oai-browser-record-formats-shown-as-archive.md)).

<a id="fn-f-a6"></a>
**f-a6** — Live-probed 2026-09-26: note q13; "Supporting Agencies", "Rights" and "Source" were saved on a published version's "Metadata" page on each app and reached no `oai_dc`, `oai_marc` or `marcxml` answer. Code: note f; `sponsor` left `schemas/publication.json` in `718ad72e5` "pkp/pkp-lib#2072 Working prototype of versioning based on new publication entity" (2019-06-26); no adapter reads `supportingAgencies`, `rights` or `source`.

<a id="fn-f-a7"></a>
**f-a7** — Live-probed 2026-09-26, OJS: the same article was typed "Peer-reviewed Article" before its section "Articles" was saved in its window and not after; a second journal's untouched "Articles" gave it ("Article évalué par les pairs" at `…/fr_CA/oai`) until the window was opened and saved unchanged; a section created on screen with "Will not be peer-reviewed" ticked gave none. The saved box is stored as an empty string per language, which the adapter's fallback to `metadata.pkp.peerReviewed` does not replace. Code: note f; the "Peer-reviewed Article" default came with `5d177baa85` (2005-07-30); no adapter reads `metaReviewed`.
Issue report: [pkp-e2e#312](https://github.com/jardakotesovec/pkp-e2e/issues/312) ([docs/issues/U19-A7-oai-dc-peer-reviewed-type-gone-after-section-save.md](../issues/U19-A7-oai-dc-peer-reviewed-type-gone-after-section-save.md)).

<a id="fn-f-a8"></a>
**f-a8** — Live-probed 2026-09-26: an article in no issue read "{journal}; " and, with "Pages" "15-20", "{journal}; ; 15-20"; a press record "{press}; ". Code: note f (`'; ' . $issue?->getIssueIdentification()` with a null issue; OMP appends "; " unconditionally).
Issue report: [pkp-e2e#313](https://github.com/jardakotesovec/pkp-e2e/issues/313) ([docs/issues/U19-A8-oai-dc-source-keeps-empty-part.md](../issues/U19-A8-oai-dc-source-keeps-empty-part.md)).

<a id="fn-f-a9"></a>
**f-a9** — Live-probed 2026-09-26, OJS, two runs: with "OJS will not be used to publish the journal's contents online." chosen, ListRecords listed the article; its Dublin Core record had no address under "Resource Identifier" or "Relation"; both MARC records kept 856 with the article page; that page sent a signed-out visitor to Login and showed a signed-in Reader "This journal does not publish its content online." (`user/authorizationDenied?message=user.authorization.journalDoesNotPublish`). The question and lean are judgment. Code: notes f, g; `OjsJournalMustPublishPolicy` is not added to the OAI handler.

<a id="fn-f-a10"></a>
**f-a10** — Live-probed 2026-09-26: note q5, step 5. Code: note h (`error()` then `exit()` inside `toXml()`, which `listRecords()` calls while building the answer).
Issue report: [pkp-e2e#335](https://github.com/jardakotesovec/pkp-e2e/issues/335) ([docs/issues/U19-A10-oai-jats-list-refused-for-one-subscription-article.md](../issues/U19-A10-oai-jats-list-refused-for-one-subscription-article.md)).

<a id="fn-f-a11"></a>
**f-a11** — Live-probed 2026-09-26, OJS, two runs: note q21, the last step. The unpublish request answered 200, the publication became unpublished and its tombstone carried no `driver` setting; the server log recorded "Plugin APP\plugins\generic\driver\DRIVERPlugin failed to handle the hook ArticleTombstoneManager::insertArticleTombstone" with the `Repository::get()` TypeError, which `Hook::call` catches. Code: note i.
Issue report: [docs/issues/U19-A11-oai-driver-set-misses-deleted-record-of-article-in-no-issue.md](../issues/U19-A11-oai-driver-set-misses-deleted-record-of-article-in-no-issue.md).

<a id="fn-f-a12"></a>
**f-a12** — Live-probed 2026-09-26: note q4. Code: note g.
Issue report: [pkp-e2e#305](https://github.com/jardakotesovec/pkp-e2e/issues/305) ([docs/issues/U19-A12-oai-marc-records-not-valid-for-their-schemas.md](../issues/U19-A12-oai-marc-records-not-valid-for-their-schemas.md)).

<a id="fn-f-a13"></a>
**f-a13** — Live-probed 2026-09-26: note q19; OJS `oai_marc` and `marcxml` read at `…/fr_CA/oai` wrote 251 and 780 `$i` "##publication.versionStage.display##" where the English read "Version of Record 2.0" and "Version of Record 1.1". The `##…##` form is how the app prints a key it has no text for in that language. Code: notes f, g, u.
Issue reports: the MARC version fields, [pkp-e2e#228](https://github.com/jardakotesovec/pkp-e2e/issues/228) ([docs/issues/U13-A1-french-version-name-raw-key.md](../issues/U13-A1-french-version-name-raw-key.md)); a book's "Resource Type", [pkp-e2e#291](https://github.com/jardakotesovec/pkp-e2e/issues/291) ([docs/issues/U69-A15-omp-french-book-page-raw-keys.md](../issues/U69-A15-omp-french-book-page-raw-keys.md)).

<a id="fn-f-a14"></a>
**f-a14** — Live-probed 2026-09-26, OJS and OPS: an article with the galleys "PDF" (en) and "PDF FR" (fr_CA) read "Language" "en" and "fr_CA", and its French values `xml:lang="fr-CA"`. Code: note f (`dc:language` the galleys' stored `locale`; `xml:lang` turns `_` into `-`).

<a id="fn-f-a15"></a>
**f-a15** — Live-probed 2026-09-26, OJS: every `oai_marc` and `marcxml` record read `"%26%09%26 %2026                        eng  "`, quotes included. Code: note g (`datePublished|date_format:"%y%m%d %Y"`; the `%` signs are printed as they stand).
Issue report: [pkp-e2e#306](https://github.com/jardakotesovec/pkp-e2e/issues/306) ([docs/issues/U19-A15-oai-marc-008-date-percent-signs.md](../issues/U19-A15-oai-marc-008-date-percent-signs.md)).

<a id="fn-f-a16"></a>
**f-a16** — Live-probed 2026-09-26, all three apps (OJS twice): `verb=ListRecords&metadataPrefix=oai_dc&metadataPrefix=oai_dc`, and the same with `set` twice, answered 500 with an empty body; the server log: `PKP\oai\OAI::getParam(): Return value must be of type ?string, array returned`; the next Identify answered. Code: notes c, m.
Issue report: [pkp-e2e#287](https://github.com/jardakotesovec/pkp-e2e/issues/287) ([docs/issues/U19-A16-oai-argument-twice-server-error.md](../issues/U19-A16-oai-argument-twice-server-error.md)).

<a id="fn-f-a17"></a>
**f-a17** — Live-probed 2026-09-26: note q16. Code: note e (OMP and OPS accept any identifier containing their start and cast the rest with `(int)`).
Issue report: [pkp-e2e#290](https://github.com/jardakotesovec/pkp-e2e/issues/290) ([docs/issues/U19-A17-oai-malformed-identifier-answers-record.md](../issues/U19-A17-oai-malformed-identifier-answers-record.md)).

<a id="fn-f-a18"></a>
**f-a18** — Live-probed 2026-09-26: note q9. OMP: a format published at 08:28:23Z, deleted at 09:09:59Z and published again read 08:28:23Z; OPS the same with 08:28:36Z and 09:13:38Z; `submissions.last_modified` did not change. Code: note e (the datestamp is `ms.last_modified` on OMP, `a.last_modified` on OPS).
Issue report: [pkp-e2e#280](https://github.com/jardakotesovec/pkp-e2e/issues/280) ([docs/issues/U19-A18-oai-datestamp-stays-after-edit-republish.md](../issues/U19-A18-oai-datestamp-stays-after-edit-republish.md)).

<a id="fn-f-a19"></a>
**f-a19** — Live-probed 2026-09-26, OJS and OPS: note q10. Code: note j.
Issue report: [pkp-e2e#309](https://github.com/jardakotesovec/pkp-e2e/issues/309) ([docs/issues/U19-A19-oai-deleted-section-set-lists-nothing.md](../issues/U19-A19-oai-deleted-section-set-lists-nothing.md)).

<a id="fn-f-a20"></a>
**f-a20** — Live-probed 2026-09-26, OJS and OPS, two sweep runs: note q11, the last read; `publicknowledge`'s deleted records of the day (OJS 198, 447, 512; OPS 174, 227) were listed for `from=2030-01-01` at its own and the site-wide address. Code: note l.
Issue report: [pkp-e2e#310](https://github.com/jardakotesovec/pkp-e2e/issues/310) ([docs/issues/U19-A20-oai-section-set-deleted-records-ignore-dates.md](../issues/U19-A20-oai-section-set-deleted-records-ignore-dates.md)).

<a id="fn-f-a21"></a>
**f-a21** — Live-probed 2026-09-26, OJS and OPS: note q19; the record headers read at `…/fr_CA/oai` named "{path}:ARTF". Code: note j (`getLocalizedAbbrev()` under the request's locale).

<a id="fn-f-a22"></a>
**f-a22** — Live-probed 2026-09-26, OJS, in three drives: while four journals of the install had "DOI Versioning" on, every Identify, list and record request of every journal and of the site-wide address answered 500 with an empty body; after "No" was saved on them, 200; a scratch journal set to "Yes" on screen brought the 500s back for 37 seconds, "No" removed them (note q20). The server log: `SQLSTATE[42804]: Datatype mismatch: 7 ERROR: UNION types text and bigint cannot be matched`, from the per-version branch of `APP\oai\ojs\OAIDAO::getRecordsRecordSetQuery()` (`NULL AS tombstone_id` against the tombstones' bigint), reached through `PKPOAIDAO::getEarliestDatestamp()` and the record lists. The test installs run Postgres; MySQL, whose union typing is looser, was not tried.
Issue report: [pkp-e2e#281](https://github.com/jardakotesovec/pkp-e2e/issues/281) ([docs/issues/U19-A22-doi-versioning-oai-requests-fail.md](../issues/U19-A22-doi-versioning-oai-requests-fail.md)).

<a id="fn-f-a23"></a>
**f-a23** — Live-probed 2026-09-26, OJS, three journals, two runs: note q21; the member without a galley had no `publication_galleys` row. Code: note i.
Issue report: [pkp-e2e#340](https://github.com/jardakotesovec/pkp-e2e/issues/340) ([docs/issues/U19-A23-oai-driver-set-lists-article-without-galley.md](../issues/U19-A23-oai-driver-set-lists-article-without-galley.md)).

<a id="fn-f-a24"></a>
**f-a24** — Live-probed 2026-09-26, OJS: note q21; a second walk of a two-member set answered the parts 1221 1222, 1221 1222, then 1222. Code: note i.
Issue report: [pkp-e2e#341](https://github.com/jardakotesovec/pkp-e2e/issues/341) ([docs/issues/U19-A24-oai-driver-list-says-more-results.md](../issues/U19-A24-oai-driver-list-says-more-results.md)).

<a id="fn-f-omp1"></a>
**f-omp1** — Live-probed 2026-09-26: note q7; a format set "Not Available" in its "Format Availability" window left the list and its GetRecord answered "No matching identifier in this repository"; "Available" again brought it back. Code: note e (`publication_formats`, `pf.is_available = 1`); the OMP Dublin Core adapter works on a publication format (note f).

<a id="fn-f-omp2"></a>
**f-omp2** — Live-probed 2026-09-26: note q6, the OMP part; the press's records were listed on every scratch press. Code: note o; the OJS/OPS exclusion is pkp/pkp-lib#6503.

<a id="fn-f-omp3"></a>
**f-omp3** — Live-probed 2026-09-26: note q10, the OMP part. Code: note j.
Issue report: [pkp-e2e#299](https://github.com/jardakotesovec/pkp-e2e/issues/299) ([docs/issues/U19-OMP3-oai-unknown-set-lists-other-records.md](../issues/U19-OMP3-oai-unknown-set-lists-other-records.md)).

<a id="fn-f-omp4"></a>
**f-omp4** — Live-probed 2026-09-26: a book published with its abstract saved empty on "Title & Abstract" made the press's ListRecords, its GetRecord and the site-wide `set={press}` list answer 500, while the site-wide first page (without the book) and ListIdentifiers answered; the server log: `Dc11SchemaPublicationFormatAdapter::addLocalizedElements(): Argument #3 ($localizedValues) must be of type array, null given`. The book was unpublished again at once. Code: note f (`Dc11SchemaPublicationFormatAdapter::addLocalizedElements(…, array $localizedValues)` receives `$publication->getData('abstract')`, null when never set; OMP's "Title & Abstract" does not require the abstract).
Issue report: [pkp-e2e#253](https://github.com/jardakotesovec/pkp-e2e/issues/253) ([docs/issues/U19-OMP4-book-without-abstract-oai-lists-fail.md](../issues/U19-OMP4-book-without-abstract-oai-lists-fail.md)).

<a id="fn-f-omp5"></a>
**f-omp5** — Live-probed 2026-09-26, all three apps, two runs: `{site address}/index.php/nosuchjournal/oai?verb=Identify` and a second unknown path answered "404 Not Found" on the press's install too. The retired entry rested on OMP `OAIHandler::index()`, which has no check of its own for an unknown press path; the request is refused before it.

<a id="fn-f-omp6"></a>
**f-omp6** — Live-probed 2026-09-26: note q10; the deleted record's set name keeps the space, and the seeded press's series read " Monographs" and " Textbooks" at `…/fr_CA/oai`. Code: note j.
Issue report: [pkp-e2e#334](https://github.com/jardakotesovec/pkp-e2e/issues/334) ([docs/issues/U19-OMP6-oai-series-set-name-leading-space.md](../issues/U19-OMP6-oai-series-set-name-leading-space.md)).

<a id="fn-f-omp7"></a>
**f-omp7** — Live-probed 2026-09-26: a book whose formats were `publicationFormat/131` and `/132` listed `/136` and `/137` once "Version of Record 2.0" was published on screen, and GetRecord of `/131` answered "No matching identifier in this repository", with no deleted record. Code: note e (each version has formats of its own, and the record is a format of the current version).

<a id="fn-f-ops1"></a>
**f-ops1** — Live-probed 2026-09-26: note q11, the preprint server part. Code: note l; the column name `a.last-modified` came with ops `5df1969511` "pkp/pkp-lib#6963 Port OAI rewrite to Laravel to OPS" (2021-06-11). Postgres answers "column … does not exist".
Issue report: [pkp-e2e#252](https://github.com/jardakotesovec/pkp-e2e/issues/252) ([docs/issues/U19-OPS1-preprint-server-oai-until-fails.md](../issues/U19-OPS1-preprint-server-oai-until-fails.md)).

<a id="fn-f-ops2"></a>
**f-ops2** — Live-probed 2026-09-26: a preprint posted with its abstract empty made the server's ListRecords, its GetRecord and the site-wide `set={server}` list answer 500 (`Dc11SchemaPreprintAdapter::addLocalizedElements()`, the same TypeError as OMP4); the preprint was unposted again at once. The Sections spec's note f-ops6 (live-probed 2026-09-25): `Dc11SchemaPreprintAdapter::addLocalizedElements()` receives a null abstract, a TypeError; written up in `docs/reports/2026-09-25-ops-oai-empty-abstract.md`.

<a id="fn-f-ops3"></a>
**f-ops3** — Live-probed 2026-09-26: "Working Paper" typed in a section's "Identify items posted in this section as a(n)"; its preprint's record read the two eu-repo words only, and the preprint's page, signed out, did not show the words. Code: note f; ops `512707bc6d` "Additional changes to OAI in PPS" (2019-11-21) removed `getIdentifyType()` from the adapter; the section form still offers the field (`sectionForm.tpl`, `manager.sections.identifyType`).

<a id="fn-f-ops4"></a>
**f-ops4** — Live-probed 2026-09-26, all three apps, two runs: after "Remove" under Administration › Hosted Journals ("Are you sure you want to permanently delete … and all of its contents?", "OK"), site-wide GetRecord of a posted preprint answered "No matching identifier in this repository" and no tombstone row was left; a removed journal's and press's items read as deleted, with a tombstone row each. Code: note n.
Issue report: [pkp-e2e#302](https://github.com/jardakotesovec/pkp-e2e/issues/302) ([docs/issues/U19-OPS4-removed-preprint-server-no-deleted-records.md](../issues/U19-OPS4-removed-preprint-server-no-deleted-records.md)).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| The OAI address and the site-wide address {OJS} | {journal address}/oai, {site address}/index.php/index/oai | ROUTE-044 |
| The OAI address and the site-wide address {OMP} | the same addresses on a press | ROUTE-064 |
| The OAI address and the site-wide address {OPS} | the same addresses on a preprint server | ROUTE-079 |
| The install's OAI configuration (on/off, repository identifier, records per answer) | the configuration file's OAI section; the installer's "OAI Settings" | SET-055 |
| "DRIVER" and its `driver` set {OJS} | Settings › Website › "Plugins", "Generic Plugins" | PLUG-013 |
| "Dublin Core 1.1 metadata", the schema the Dublin Core format reads | Settings › Website › "Plugins", "Metadata Plugins" | PLUG-036 |
| "DC Metadata Format" (`oai_dc`) | "OAI Metadata Format Plugins" | PLUG-037 |
| "MARC Metadata Format" (`oai_marc`) {OJS} | "OAI Metadata Format Plugins" | PLUG-038 |
| "MARC21 Metadata Format" (`marcxml`) {OJS} | "OAI Metadata Format Plugins" | PLUG-039 |
| "JATS Metadata Format" (`jats`) and its "Settings" window {OJS} | "OAI Metadata Format Plugins" | PLUG-040 |
| "Enable OAI" {OJS OPS} | Settings › Distribution › "Access" (the Access tab's other fields are *Subscriptions & open access control*'s) | — |
| The browser view | `lib/pkp/xml/oai2.xsl`, loaded by every answer | — |

## Reference — code anchors

- Protocol (shared): `lib/pkp/classes/oai/{OAI,OAIConfig,OAIUtils,OAIRecord,OAIIdentifier,OAIRepository,OAIResumptionToken,OAISet,OAIMetadataFormat,PKPOAIDAO}.php` · `lib/pkp/classes/plugins/OAIMetadataFormatPlugin.php` · `lib/pkp/xml/oai2.xsl`
- Handlers: `ojs|omp|ops/pages/oai/{index,OAIHandler}.php`
- App repositories and DAOs: `ojs/classes/oai/ojs/{JournalOAI,OAIDAO}.php` · `omp/classes/oai/omp/{PressOAI,OAIDAO}.php` · `ops/classes/oai/ops/{ServerOAI,OAIDAO}.php`
- Deleted records: `ojs/classes/article/ArticleTombstoneManager.php` · `omp/classes/publicationFormat/PublicationFormatTombstoneManager.php` · `ops/classes/preprint/PreprintTombstoneManager.php` · `lib/pkp/classes/tombstone/{DataObjectTombstone,DataObjectTombstoneDAO,DataObjectTombstoneSettingsDAO}.php` · callers `ojs/classes/publication/Repository.php`, `ojs/classes/controllers/grid/issues/IssueGridHandler.php`, `omp/classes/publication/Repository.php`, `omp/controllers/grid/catalogEntry/PublicationFormatGridHandler.php`, `ops/classes/submission/Repository.php`, `*/classes/services/ContextService.php`
- Dublin Core: `lib/pkp/plugins/oaiMetadataFormats/dc/{PKPOAIMetadataFormatPlugin_DC,PKPOAIMetadataFormat_DC}.php` · `ojs|omp|ops/plugins/oaiMetadataFormats/dc/` · `lib/pkp/plugins/metadata/dc11/` · `ojs/plugins/metadata/dc11/filter/Dc11SchemaArticleAdapter.php` · `omp/plugins/metadata/dc11/filter/Dc11SchemaPublicationFormatAdapter.php` · `ops/plugins/metadata/dc11/filter/Dc11SchemaPreprintAdapter.php`
- MARC (OJS): `plugins/oaiMetadataFormats/marc/{OAIMetadataFormatPlugin_MARC,OAIMetadataFormat_MARC}.php`, `templates/record.tpl` · `plugins/oaiMetadataFormats/marcxml/{OAIMetadataFormatPlugin_MARC21,OAIMetadataFormat_MARC21}.php`, `templates/record.tpl`
- JATS (OJS): `plugins/oaiMetadataFormats/oaiJats/{OAIMetadataFormatPlugin_JATS,OAIMetadataFormat_JATS,OAIJatsSettingsForm}.php`, `templates/settingsForm.tpl` · `plugins/generic/jatsTemplate/JatsTemplatePlugin.php::callbackFindJats()`
- DRIVER (OJS): `plugins/generic/driver/{DRIVERPlugin,DRIVERDAO}.php`
- Settings: `ojs|ops/classes/components/forms/context/AccessForm.php` · `ojs|ops/schemas/context.json` (`enableOai`) · `lib/pkp/classes/components/forms/context/PKPDoiSetupSettingsForm.php` · `lib/pkp/controllers/grid/plugins/PluginGridCellProvider.php` · `config.TEMPLATE.inc.php` `[oai]` · `lib/pkp/classes/install/form/InstallForm.php`
- Access: `lib/pkp/classes/handler/PKPHandler.php::authorize()` · `lib/pkp/classes/security/authorization/RestrictedSiteAccessPolicy.php` · `lib/pkp/classes/core/PKPPageRouter.php::route()`, `handleAuthorizationFailure()` · `lib/pkp/classes/core/PKPSessionGuard.php`
- Locale: `ojs|ops/locale/en/manager.po` (`manager.setup.enableOai*`) · `lib/pkp/locale/en/manager.po` (`plugins.categories.oaiMetadataFormats`) · plugin `locale/en/locale.po` files · `ojs/locale/en/locale.po` (`metadata.pkp.peerReviewed`) · `omp/locale/en/locale.po` (`rt.metadata.pkp.dctype`)
