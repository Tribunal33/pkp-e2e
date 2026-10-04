# "Search references here" keeps references whose text does not contain the typed word

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; one free-text References box, no search)
  - 3.4: none (code; one free-text References box, no search)
  - 3.3: none (code; one free-text References box, no search)
- **Introduced** `pkp/ui-library#716` for `pkp/pkp-lib#10692` · [c2f8e07d](https://github.com/pkp/ui-library/commit/c2f8e07d19caa0f6b2385d1ca48fc716d85d07c0) · 2025-09-16 · Božana Bokan (bozana), commits by GaziYucel; widened to numbers and yes/no values by `pkp/ui-library#733` for `pkp/pkp-lib#11902` · [8cecf866](https://github.com/pkp/ui-library/commit/8cecf8665a8ba750401808dd4f22d67abfac6b4e) · 2025-10-24
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U42 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U42-citations-and-references.md#a3)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

Typing a word into "Search references here" is expected to keep the
rows that show it. The search also looks in data no row displays: a web
address stored with each reference, its numbers, and a yes/no value
saying whether the reference's details (authors, title, DOI) have been
filled in. So "citations" or "http" keep every row, "false" keeps every
reference whose details are not filled in, and a digit such as "0"
keeps rows that show no digit at all.

Nothing is changed or lost: the search keeps rows it should have
hidden, and clearing it shows the whole list again. A search for a word
or a year a reference's text holds still keeps the right rows; the
extra rows come with words and digits the stored data also holds.

## Impact

- **Lost** Nothing; some searches keep rows without the typed word, or
  keep the whole list.
- **Who** Anyone who opens a submission's "References" page and
  searches it: the editors who may change the list, and authors and
  others who see the page read-only, where the search works too. In the
  walk, "epsilon" and "2021" kept only the right row, while "0" kept two
  extra rows out of five.
- **Way round** Reading the rows that are kept; the rows that do hold
  the word are always among them.

Low: a list filter that keeps too many rows, with the right rows always
among them.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, OMP or OPS. Its journal,
  press and server ask for references (Settings › Workflow › Submission
  › Metadata, "References"), so the workflow offers "References". No
  submission has a reference.
- "Enable references structuring and metadata lookup", under
  "References Metadata Lookup" on the same page, is off, as it is by
  default. With it on, the install processes each reference after
  "Add" and stores its status and any identifiers it finds, so step 7's
  result differs (not walked).

Steps:

1. Sign in as `dbarnes` and open submission 8, "Traditions and Trends in
   the Study of the Commons" (OJS), 3, "The Political Economy of
   Workplace Injury in Canada" (OMP), or 1, "The influence of lactation
   on the quantity and quality of cashmere production" (OPS).
2. Open "Publication" ("Preprint" on OPS) › "References".
3. Type these five lines into the "References" box and press "Add":

   ```
   Alpha study 2020
   Beta trial 2021
   Gamma report 2022
   Epsilon note
   Zeta final piece
   ```

4. Type `citations` into "Search references here" and press Enter.
5. Press the box's "Clear search phrase" (×), type `http` and press
   Enter.
6. The same with `false`.
7. The same with `0`.

**Expected.** Steps 4 to 6 keep no row, since no reference holds those
words. Step 7 keeps the three references with a year, not "Epsilon
note" or "Zeta final piece".

**Observed.** Each of the four searches keeps all five rows: "Alpha
study 2020", "Beta trial 2021", "Gamma report 2022", "Epsilon note",
"Zeta final piece".

Control: `epsilon` keeps "Epsilon note" alone, `ZETA piece` keeps "Zeta
final piece" alone, and `2021` keeps "Beta trial 2021" alone.

## Cause

The table lists `citationsFiltered` from the ui-library's
`citationManagerStore.js`
(`lib/ui-library/src/managers/CitationManager/citationManagerStore.js`,
lines 202 to 222). For each reference it takes every value of the
reference's record as the REST API sends it (the keys dropped), turns
them into one JSON string with `JSON.stringify()`, and keeps the row
when that string contains each typed word.

The record holds much more than the row shows (`lib/pkp/schemas/citation.json`):

- `_href`, the reference's own API address, which holds "http",
  "citations", "api", the context's path and the host;
- the authors' `orcid`, `openAlex` and `wikidata` addresses, which also
  match "http" (each author carries every author field, filled in
  empty, from `Schema::getCitationAuthorDataModel()`);
- `id`, `publicationId`, `seq` and `processingStatus` (0 until lookup
  has run, so "0" matches every reference on a journal without lookup);
- `isStructured` (`false` until a reference's details are filled in);
- `rawCitationWithLinks`, the text with its links as HTML (`href`,
  `target`, `_blank`);
- fields the row never shows: `sourceIssn`, `sourceHost`, `sourceType`,
  `type`; and the reference's `openAlex` and `wikidata` addresses, which
  a row with lookup on shows only as badges named "OpenAlex" and
  "Wikidata".

JSON's own punctuation is in the string too, so typing `"` or `,`
keeps every row.

The row itself shows less, and what it shows depends on the lookup
setting (`CitationManagerCellCitation.vue`): with lookup off, the
reference's text alone; with lookup on, its DOI, URL, arXiv ID, handle
and URN, and for a reference whose details are filled in, its title and,
expanded, its authors, source, date, volume, issue, pages and text.

The first version of the search
([c2f8e07d](https://github.com/pkp/ui-library/commit/c2f8e07d19caa0f6b2385d1ca48fc716d85d07c0))
already searched every text value of the record, the address included;
[8cecf866](https://github.com/pkp/ui-library/commit/8cecf8665a8ba750401808dd4f22d67abfac6b4e)
replaced it with the JSON string, adding the numbers, the yes/no value
and the punctuation, while making the search match each word rather
than the whole phrase.

Reach: only the References table filters this way (checked in the
code). The components that filter in the browser name the fields they
search (`ManageEmailsPage.vue`: a mailable's `name` and `description`;
`InsertContent.vue`: an item's `key`, `value` and `description`), and
the other managers' stores send the phrase to the server.

## Proposed fix

Search the text the row shows, expanded or not, following the row's
mode: with lookup off the reference's text alone; with lookup on also
its identifiers, and for a reference whose details are filled in, the
details the row displays. A reference whose details were filled in
while lookup was on then no longer matches on its hidden title or DOI
once lookup is off, because its row no longer shows them. Each typed
word must still appear, as today: the components named above match the
whole phrase, but per-word matching is the page's shipped behaviour and
lets an editor search an author with a year. The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reference-search-keeps-rows-without-word/fix.diff):

```diff
 				? data.filter((citation) => {
-						// remove all keys from object and search in values only
-						let values = Object.values(citation).map((value) => { … });
-						return searchWords.every((word) => {
-							return JSON.stringify(values).toLowerCase().includes(word);
-						});
+						const text = getSearchableText(citation);
+						return searchWords.every((word) => text.includes(word));
 					})
+		function getSearchableText(citation) {
+			const values = [citation.rawCitation];
+			if (citationsMetadataLookup.value) {
+				values.push(citation.doi, citation.url, citation.arxiv, citation.handle, citation.urn);
+				if (citation.isStructured) {
+					values.push(
+						citation.title, citation.sourceName, citation.date,
+						citation.volume, citation.issue, citation.firstPage, citation.lastPage,
+						...(citation.authors || []).flatMap((author) => [
+							author?.givenName,
+							author?.familyName,
+						]),
+					);
+				}
+			}
+			return values
+				.filter((value) => value !== null && value !== undefined)
+				.join(' ')
+				.toLowerCase();
+		}
```

Tried on `main` for OMP with lookup off (an earlier version searching
the same fields in both modes, on OJS, OMP and OPS, gave the same
result): steps 4 to 6 keep no row and step 7 keeps the three references
with a year. The control searches keep the same single rows with the
fix as without it, and clearing the search shows all five. With lookup on (OMP, the fix
applied), a reference given a URL, a title, an author and a "Publisher
or Host" in "Edit citation" was found by a word of its title, its
author's family name and its own text, and not by the word only its
"Publisher or Host" held.

**Alternatives**

- Search the same fields whatever the setting: a reference's hidden
  title or DOI would still match with lookup off, the fault this report
  is about.
- Leave out only the address and the ids: the yes/no value, the
  processing status and the fields no row shows would still match.
- Search the row's rendered text in the page: it would miss what a
  structured reference shows only when expanded.

**What goes with it**

- The date matches as stored (`2020-01-05`), while the row shows it
  formatted; a year matches either way.
- With the fix, a search that keeps no row shows the empty list's line,
  "The citations list is empty, please add citations above.", as any
  search without a match does today. It reads as if the list had no
  reference; a line such as "No reference matches the search" would
  suit, a wording change apart from this fix.
- A guard: a Planned e2e item in the spec, or a ui-library unit test of
  the store's filter.

Small: one function in one ui-library store, following the
named-fields pattern of the components that filter in the browser,
tried as written.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reference-search-keeps-rows-without-word/walk.js)
  (helpers in `../pasted-repeat-reference-dropped-saved/lib.js`) takes
  the Steps on PKP's default test dataset, freshly loaded:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/reference-search-keeps-rows-without-word/walk.js`;
  `MODE=nb` runs the control searches alone.
- Walked on `main`, PostgreSQL, pkp/datasets 566bb1f (2026-10-03), at
  OJS ff004d0973 (lib/pkp 987776cd04, ui-library 64d67363), OMP
  3b0ecf794 and OPS c8af945bb7 (lib/pkp 3dc90c81a6, ui-library
  280f98c5). `citationManagerStore.js` is the same in the three
  checkouts. No server error or script error was logged during the
  walks.
- With metadata lookup on, the unpatched search was not walked; the
  lookup-on fields of the Cause are read from `citation.json` and
  `CitationManagerCellCitation.vue`. The fix's lookup-on branch was
  walked once on OMP with `MODE=lookup` (a manager ticks "Enable
  references structuring and metadata lookup", then the edit and the
  four searches).
- 3.5 (code): `stable-3_5_0` at OJS c1cee76b95, lib/pkp 771474347e,
  ui-library d4e01883: one "References" box (`PKPCitationsForm`, field
  `citationsRaw`) and no `CitationManager` in ui-library, so no list and
  no search.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` (OJS d68934d0d1, lib/pkp
  767353f4fe, ui-library ee684b34) and `stable-3_3_0` (OJS ac77c9fb35,
  lib/pkp ac3fa73402, ui-library 96959f9e): the same free-text box and
  no `CitationManager`.
- Trackers searched on 2026-10-04: `pkp/pkp-lib` and `pkp/ui-library`.
