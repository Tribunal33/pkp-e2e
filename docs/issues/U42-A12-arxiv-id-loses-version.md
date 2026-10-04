# An arXiv ID entered for a reference or a data citation loses its version, or is refused with it

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no structured references or data citations)
  - 3.4: none (code; no structured references or data citations)
  - 3.3: none (code; no structured references or data citations)
- **Introduced** `pkp/pkp-lib#12000` for `pkp/pkp-lib#11902` · [2516e5a60c](https://github.com/pkp/pkp-lib/commit/2516e5a60cb9c201a35cb7c2af771397aed55ba6) · 2025-10-24 · Bozana Bokan (bozana), commit by GaziYucel; the refusal came with `pkp/pkp-lib#12455` for `pkp/pkp-lib#12354` · [6be6b501c1](https://github.com/pkp/pkp-lib/commit/6be6b501c1817cec29efdd1e4aa072f3e4340ae2) · 2026-04-01 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U42 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U42-citations-and-references.md#a12)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

A reference's "Edit citation" panel has an "Arxiv" box whose help text
offers an ID in three forms: bare, after "arxiv:", and as its
https://arxiv.org/abs/ address. Typed bare, "2101.12345v2" is kept as
typed. Typed as "arxiv:2101.12345v2" or
"https://arxiv.org/abs/2101.12345v2", it is saved as "2101.12345",
without a word. When a reference's text holds "arXiv:2101.12345v2", the
metadata lookup fills "Arxiv" with "2101.12345" from it.

A data citation of type "ARXIV" saves
"https://arxiv.org/abs/2101.12345v2" as "2101.12345" and refuses the
bare "2101.12345v2" as not a valid ARXIV identifier, while the
unversioned "2101.12345" is accepted. Either way the record loses which
version of the paper or dataset the work cites.

The reference half needs metadata lookup on, since with it off "Edit
citation" holds only the reference's text. The data citation half needs
data citations on. Both settings sit in Settings › Workflow and are off
by default.

## Impact

- **Lost**: which version of an arXiv paper or dataset the work cites.
  arXiv versions can differ in content, and a version-less ID leads to
  the newest one. Nobody is told; a reference's text keeps the version,
  its structured ID does not.
  The version-less ID goes out in a journal's JATS XML (references and
  data citations) and its DataCite and Crossref deposits (data
  citations), and in a preprint server's Crossref deposit (data
  citations). A press sends it out through no export, only its REST API.
- **Who**: editors and managers editing references with metadata lookup
  on, and anyone adding a data citation, whenever the ID carries a
  version. By the code, an author meets it too: references typed in the
  submission wizard go through the same lookup when it is on (the author
  never sees the "Arxiv" box), and the wizard's "Data" section saves
  data citations through the same check.
- **Way round**: for a reference, type the bare ID in "Edit citation".
  For a data citation, choose the type "URI" and type the versioned
  address, which is kept whole (seen on OJS), at the cost of the arXiv
  type.

Medium: the version a user types is dropped silently from an identifier
that the exports carry, on a narrow input in a setup that is not the
default.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), as loaded:
  references on ("Ask the author…"), metadata lookup and data citations
  off.
- The install runs its background jobs: `job_runner = On` in
  `config.inc.php` (the default, and the dataset's), or a queue worker.
  Step 7 reads what the lookup's first job writes.

Setup:

1. Sign in as `dbarnes`.
2. Open Settings › Workflow › "Submission" › "Metadata".
3. Under "References Metadata Lookup" tick "Enable references
   structuring and metadata lookup".
4. Under "Data Citations" tick "Enable data citation metadata", choose
   "Ask the author for data citation metadata during submission." and
   press "Save".

Editing a reference:

5. Open submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice" [OMP: 3, "The
   Political Economy of Workplace Injury in Canada"; OPS: 1, "The
   influence of lactation on the quantity and quality of cashmere
   production"], and go to Publication › "References" [OPS: Preprint ›
   "References"].
6. Type "Doe J. Attention in study groups. arXiv:2101.12345v2" in the
   box and press "Add".
7. Wait until the new row shows an ID above its text, reloading the
   page if needed (the lookup's first job has run). Press "More
   Actions" › "Edit", read "Arxiv" and press "Close".
8. Open "Edit" again, type "arxiv:2101.12345v2" in "Arxiv" and press
   "Save". Open "Edit" and read "Arxiv".
9. Type "https://arxiv.org/abs/2101.12345v2", "Save", open "Edit" and
   read "Arxiv".
10. Type "2101.12345v2", "Save", open "Edit" and read "Arxiv".

Adding a data citation:

11. Go to Publication › "Data" [OPS: Preprint › "Data"] and press "Add
    Data Citation".
12. Title "u42r5 dataset by address", Identifier type "ARXIV",
    Identifier "https://arxiv.org/abs/1234.12345v2", Relationship type
    "Supporting data without specifying whether they were generated or
    analyzed (supporting)."; press "Save".
13. Press "Add Data Citation" again: Title "u42r5 dataset bare", "ARXIV",
    Identifier "3456.34567v4", the same relationship; press "Save".
14. Change Identifier to "4567.45678" and press "Save".

**Expected**: every form keeps the version typed. Steps 7 to 10 read
"2101.12345v2", step 12's row shows "1234.12345v2", and step 13 saves.

**Observed** (the same on OJS, OMP and OPS): right after "Add" the row
shows "2101.12345" above its text, and step 7 reads "2101.12345",
step 8 "2101.12345", step 9 "2101.12345", step 10 "2101.12345v2". The
box's help text reads "e.g. 1234.123456v2, arxiv:1234.123456v2,
https://arxiv.org/abs/1234.123456v2". Step 12's row shows
"1234.12345 u42r5 dataset by address". Step 13 keeps the panel open:

```
"3456.34567v4" is not a valid ARXIV identifier.
Please correct one error.
```

Step 14 saves, and the row shows "4567.45678 u42r5 dataset bare".

## Cause

`PKP\pid\Arxiv` (`lib/pkp/classes/pid/Arxiv.php`) describes an arXiv
identifier with two patterns, and neither allows the version suffix
that arXiv's identifier scheme appends (`2101.12345v2`,
`hep-th/9901001v1`):

- `regexes` (line 24), the extraction pattern,
  `/(?:arxiv:\s*|https?:\/\/arxiv\.org\/(?:abs|pdf)\/)(?:\d+\.\d+|[a-z.-]+\/\d+)/i`,
  stops at the digits, so `BasePid::extractFromString()` returns
  "2101.12345" for "arxiv:2101.12345v2". The comment above the pattern
  gives "arxiv:2025.12345v2" as its own example.
- `validationRegexes` (line 29), `/^(?:\d+\.\d+|[a-z.-]+\/\d+)$/i`, makes
  `BasePid::isValid()` refuse "3456.34567v4".

Every path that takes an arXiv ID from a prefix or an address, and
every check of a data citation's, goes through these patterns. A bare
value in "Edit citation" is checked only by `schemas/citation.json`'s
own pattern, which has no end anchor, never by `validationRegexes`.

- `PKPCitationController::edit()` (`api/v1/citations/PKPCitationController.php`
  line 213) replaces `arxiv` with the extracted value when there is one.
  The extraction needs a prefix or an address, so a bare ID matches
  nothing and is kept as typed (then checked only by
  `schemas/citation.json`'s own pattern). On screen, three apps.
- `ExtractPidsHelper::execute()` (`classes/citation/pid/ExtractPidsHelper.php`
  line 40), run by `ExtractPidsJob`, the lookup's first job, fills
  `arxiv` from the reference's text. On screen, three apps (step 7).
- `dataCitation\Repository::validate()` checks the identifier with
  `extractFromString()` or `removePrefix()` (line 86), then `isValid()`
  (line 88); the
  `saving` hook in `DataCitation::boot()` (line 75) stores the
  extracted value. `PidResolver` maps "ARXIV" to this class. On screen,
  three apps, for "Add Data Citation"; "Edit Data Citation" and the
  submission wizard's "Data" section save through the same API (code).
- On a journal, the JATS XML carries a reference's `arxiv` as
  `<pub-id pub-id-type="arxiv">` (`plugins/generic/jatsTemplate/classes/ArticleBack.php`
  line 148) and a data citation's identifier (line 349), and the DataCite
  deposit sends an "ARXIV" data citation as an `arXiv` related identifier
  (`plugins/generic/datacite/filter/DataciteXmlFilter.php` line 931).
  The Crossref deposits of OJS and OPS send a data citation's identifier
  with its type (`ArticleCrossrefXmlFilter.php` line 952,
  `PreprintCrossrefXmlFilter.php` line 524). OMP has no export that
  reads either. Code only.

The other `PKP\pid` classes have no such gap: none of the identifiers
they describe has a suffix their patterns cut off (`Doi`, `Handle`,
`Ark`, `Ecli`, `Isbn`, `Issn`, `Orcid`, `Pmid`, `Pmcid`, `Url`, `Urn`,
`Uuid` read; `Accession` and `Purl` have no patterns).

The extraction pattern came with `pkp/pkp-lib#12000` (for
`pkp/pkp-lib#11902`, which asked for PID validation), replacing a
generic address pattern. The validation pattern came with
`pkp/pkp-lib#12455` (for `pkp/pkp-lib#12354`, validation of data
citation identifiers), which copied the same body.

## Proposed fix

Let both patterns end with an optional version, in `PKP\pid\Arxiv`
alone, so the reference panel, the lookup and data citations all keep
it ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/arxiv-id-loses-version/fix.diff)):

```diff
-        '/(?:arxiv:\s*|https?:\/\/arxiv\.org\/(?:abs|pdf)\/)(?:\d+\.\d+|[a-z.-]+\/\d+)/i'
+        '/(?:arxiv:\s*|https?:\/\/arxiv\.org\/(?:abs|pdf)\/)(?:\d+\.\d+|[a-z.-]+\/\d+)(?-i:v\d+)?/i'
...
-        '/^(?:\d+\.\d+|[a-z.-]+\/\d+)$/i'
+        '/^(?:\d+\.\d+|[a-z.-]+\/\d+)(?-i:v\d+)?$/i'
```

As for `Doi` and `Handle`, the class alone holds the rule, so no caller
changes. The suffix is arXiv's own `v<n>`, for new-style and old-style
IDs alike. It is matched in lower case only (`(?-i:…)`), as arXiv
writes it, so "2101.12345V2" is cut or refused as today rather than
stored in a form arXiv does not use. An ID without a version and every
malformed value behave as today. In a reference's text, trailing
material is untouched: "arXiv:2101.12345v2." gives "2101.12345v2", and
"arXiv:2101.12345 vol 2" still gives "2101.12345".

Tried on `main` (as written on OJS; Evidence says what OMP and OPS
ran); the walk then showed Expected on each app. Inputs that must not change gave the same results with the fix in
and out: "xyz" still refused in "Arxiv", "arxiv:2101.12345" still
stored as "2101.12345", and of type "ARXIV" "3456.34567vx",
"3456.34567V4" and "not-an-arxiv-id" still refused, "arxiv:2345.23456"
and "hep-th/9901001" saved as before; a DOI address still stored bare,
and a "URI" with the versioned arXiv address kept whole. The one change
beyond the steps is "hep-th/9901001v1", refused before and saved with
the fix.

**Alternatives**

- Match arXiv's scheme exactly (four-digit month, four or five digits,
  seven-digit old-style numbers, as the pattern proposed in the review
  of `pkp/pkp-lib#11915`): it would refuse IDs accepted today, the help
  text's own "1234.123456v2" (six digits, which arXiv never issues)
  among them, so it needs a product decision and new help text. It is
  not needed to keep the version.
- Extract in `PKPCitationController::edit()` only: leaves the lookup and
  data citations losing it.

**What goes with it**

- The guard: versioned cases in
  `tests/classes/dataCitation/DataCitationIdentifierValidationTest.php`'s
  `testArxivValidation()` ("2301.00001v2", "arxiv:2301.00001v2",
  "https://arxiv.org/abs/2301.00001v2", "cs.AI/0601001v1" valid,
  "2301.00001V2" invalid), and a new `tests/classes/pid/ArxivTest.php`
  (lib/pkp has no `tests/classes/pid/` yet) with
  `Arxiv::extractFromString()` cases: "arxiv:2301.00001v2" and
  "https://arxiv.org/abs/2301.00001v2" give "2301.00001v2".
- No data repair: IDs already saved have lost their version, which no
  code can restore, and the feature is on `main` only, unreleased.
- No backport: 3.5 and older have no `PKP\pid` classes.
- Optional: help text "e.g. 2101.12345v2, arxiv:2101.12345v2,
  https://arxiv.org/abs/2101.12345v2", a real ID's shape.

Small: two patterns in one class and a few test cases, tried as
written.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/arxiv-id-loses-version/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/arxiv-id-loses-version/lib.js),
  on a freshly loaded default dataset:
  `PROBE_FEATURE=<feature> node bin/probe.js all shared/playwright/checks/issues/arxiv-id-loses-version/walk.js`.
  The default mode takes the steps; `WALK_MODE=neighbour` the inputs
  that must not change. The script opens each workflow by its dashboard address rather
  than from the list. It saw no
  failed request other than step 13's refusal (400) and no script error.
  The server log holds the lookup's own outbound request failing
  (`ExternalServicesHelper::apiRequest cURL error 7 … api.crossref.org`),
  which a test install without outbound connections gives.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/arxiv-id-loses-version/fix.diff <app>`,
  the default mode, then `neighbour` with the fix in and out, then
  `revert`, one app at a time. The fix as written (lower-case suffix
  only) was tried on OJS; an earlier form that matched the suffix in any
  case was tried on OMP and OPS with the same results for every input
  the walk types, all of them lower case. The "3456.34567V4" and "URI"
  inputs were added for the final trial, on OJS only.
- Walked on PostgreSQL. The fault does not depend on the database.
- Dataset: pkp/datasets 566bb1f (2026-10-03).
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c
  (lib/pkp 3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6; the files
  named in the Cause are the same as OJS's); `stable-3_5_0` OJS
  c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c and OPS 38b61882d3
  (lib/pkp cf3f984335); `stable-3_4_0` OJS d68934d0d1, OMP 0aec65441f,
  OPS acd8ae704b (lib/pkp 767353f4fe); `stable-3_3_0` OJS ac77c9fb35,
  OMP 8e72fc8836, OPS c5532e2161 (lib/pkp ac3fa73402).
- Code read on 3.5, 3.4 and 3.3: no `classes/pid`, no
  `classes/dataCitation`, no `arxiv` in lib/pkp's classes, API, schemas
  or English locale, and none in the apps' plugins; references are the
  free-text "References" box. Not walked on 3.5 for that reason.
- arXiv's identifier scheme: <https://info.arxiv.org/help/arxiv_identifier.html>
  (new-style `YYMM.NNNN` to 2014 and `YYMM.NNNNN` from 2015, old-style
  `archive(.class)/YYMMNNN`, each with an optional `v<n>`).
- Introduced: `git blame` on `Arxiv.php` lines 24 and 29 gives
  6be6b501c1, which created `classes/pid/Arxiv.php` from
  `classes/citation/pid/Arxiv.php`; there the extraction pattern without
  a version came in 2516e5a60c (`pkp/pkp-lib#12000`, merged 2025-11-05)
  in place of 4730f6707e's generic address pattern. 6be6b501c1 added the
  validation pattern. In `pkp/pkp-lib#11915`'s review a pattern ending
  `(?:v\d+)?` was quoted from Wikidata; the merged one has none.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library for "arxiv", "arxiv version", "data citation identifier
  invalid" and `Arxiv validationRegexes`; `pkp/pkp-lib#12354` lists
  unversioned IDs only as its valid cases.
- The Summary uses one ID throughout. The walk typed IDs of the same
  shape for the data citations ("1234.12345v2", "3456.34567v4",
  "4567.45678"), so each row is told apart; the patterns treat them
  alike.
- "Edit citation" with lookup off (the text box alone) is the spec's
  claim-checked fact (U42 Fields & validation), not part of this walk.
- Unverified: the JATS, DataCite and Crossref outputs, and the wizard's
  References box and "Data" section, were read in the code, not
  generated or walked.
