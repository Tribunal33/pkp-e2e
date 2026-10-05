# A reference author's "ORCID iD" takes any web address, and editors' ORCID icon links to it

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Security** unreleased
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (references are one free-text box)
  - 3.4: none (code; the same free-text box)
  - 3.3: none (code; the same free-text box)
- **Introduced** `pkp/pkp-lib#11884` for `pkp/pkp-lib#10692` · [4730f6707e](https://github.com/pkp/pkp-lib/commit/4730f6707ea4a350ff8f733172b1c9537d5481b7) · 2025-09-16, merged 2025-10-02 · Bozana Bokan (bozana), the commit by GaziYucel (GaziYucel)
- **Upstream** none found (2026-10-05)
- **Tracked in** spec U42 [A22](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U42-citations-and-references.md#a22)
- **Checked** 2026-10-05, each branch's tip (the commits in Evidence)

## Summary

On a submission's "References" page, "Edit citation" has an "ORCID iD"
box for each author of a cited work. The box for a data citation's
creators refuses anything but an ORCID address. This one keeps
whatever is typed, including another website's address or a
`javascript:` link. With metadata lookup on, the expanded reference
shows that author with an ORCID icon, and pressing the icon opens the
typed address in a new tab instead of an ORCID profile.

Anyone who may edit the publication can type it. On a preprint server
that includes the submitting author, because authors may edit their
metadata by default. On a journal or press it includes the author
once an editor has ticked the author's permission to change the
publication. The editors, managers and assistants who press the icon
are the ones sent to the author's page.

## Impact

- **Lost**: the reference author's ORCID link goes to an address the
  author chose, and the icon gives no sign of it. Nobody is warned.
- **Who**: editors, managers and assistants who open "References" with
  "Enable references structuring and metadata lookup" on (off by
  default), expand a reference and press its author's ORCID icon. The
  value stays inside the install: the published page prints only each
  reference's text, and the JATS XML and Crossref deposits carry
  reference authors' names without their ORCID iDs.
- **Way round**: hovering the icon shows the address before it is
  pressed, and an editor can correct the box in "Edit citation".
  Nothing stops the author from typing it again.

Medium. What the author gains is a page of their choice opened from a
trusted staff screen under an ORCID icon, for example a page that
imitates a sign-in form to collect the editor's password. A
`javascript:` value is stored and becomes the icon's link just the
same; it is refused only once the fix is in. Pressed in Chrome, the only
browser tried, it opened an empty tab and ran nothing, and the opened
tab had no way back to the editor's page. Script running in another
browser would raise this to high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS).
- A reference added while metadata lookup is still off, as it is in the
  dataset. With lookup on, adding a reference starts a background
  lookup (Crossref, OpenAlex, ORCID). If that lookup is still running
  when step 6 saves the ORCID iD, it sends the typed value to ORCID,
  gets "not found" and empties the box, and the icon never appears.
  - Sign in as `dbarnes` (password `dbarnesdbarnes`) and open the
    submission (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<id>`).
  - In the side menu under "Publication" ("Preprint" on OPS), choose
    "References". Type `Lovelace A. sxx5 Notes on the analytical engine.
    1843.` in "References" and press "Add".
  - Go to Settings › Workflow › "Submission" › "Metadata", tick "Enable
    references structuring and metadata lookup" and press "Save".
- OJS and OMP only: the author may change the publication. As
  `dbarnes`, open the submission, and under "Participants" open the
  author's "More Actions" › "Edit". Tick "Allow this person to make
  changes to the publication, …" and press "OK". A preprint server
  gives its authors this permission by default.

The submission per app: OJS 2, "The influence of lactation on the
quantity and quality of cashmere production" (author `ccorino`); OMP 2,
"The West and Beyond: New Perspectives on an Imagined Region" (author
`afinkel`); OPS 1, "The influence of lactation on the quantity and
quality of cashmere production" (author `ccorino`).

The author:

1. Sign in as the author (password the username twice) and open the
   submission from "My Submissions"
   (`/index.php/publicknowledge/en/dashboard/mySubmissions?workflowSubmissionId=<id>`).
2. In the side menu under "Publication" ("Preprint" on OPS), choose
   "References".
3. On the reference's row, press "More Actions" and choose "Edit".
4. Type `10.1234/sxx5` in "DOI" and `sxx5 Notes on the analytical
   engine` in "Title". A row shows its authors only once it has an
   identifier, a title and an author.
5. Under "Author Information", press "Add". Type "Ada" as Given Name,
   "Lovelace" as Family Name and `https://example.com/sxx5-not-an-orcid`
   as ORCID iD.
6. Press "Save".

An editor:

7. Sign out, sign in as `dbarnes` and open the same submission's
   "References".
8. Press the row's expand button.
9. Press the ORCID icon after "Lovelace Ada".

**Expected.** At step 6 the panel stays open and refuses the box, as it
does for a data citation's creators: "The ORCID iD you specified is
invalid. Please include the full URI (e.g.
"https://orcid.org/0000-0002-1825-0097")." No ORCID icon links anywhere
but an ORCID profile.

**Observed.** At step 6 the panel saves and closes, and the author is
stored as typed:

```
authors | [{"givenName":"Ada","familyName":"Lovelace","orcid":"https://example.com/sxx5-not-an-orcid"}]
```

At step 8 the row reads "Lovelace Ada" followed by the icon:

```html
<a class="inline-flex items-center" href="https://example.com/sxx5-not-an-orcid" target="_blank">
```

At step 9 a new tab opens on `https://example.com/sxx5-not-an-orcid`.

Typed as `javascript:alert(document.domain)` at step 5, the value is
saved and becomes the icon's `href` in the same way.

## Cause

The reference author's `orcid` property in pkp-lib's citation schema has
no validation rule. `schemas/citation.json` (lines 43-45 on `main`)
declares it as:

```json
"orcid": {
    "type": "string"
},
```

`PKPCitationController::edit()` validates the "Save" against that
schema through `Repo::citation()->validate()`, which passes any string.
The sibling schemas check the same value. Contributors (`author.json`)
use `["nullable", "orcid"]` and data citation creators
(`dataCitation.json`) use `["orcid"]`. Both call the `orcid` rule from
`ValidationServiceProvider`, which accepts only an
`https://(sandbox.)orcid.org/` address with a valid check digit.

ui-library's `CitationManagerCellCitation.vue` (lines 54-59) renders the
stored value unchanged as the author's link (`:href="author.orcid"`,
`target="_blank"`). Vue does not filter a bound `href`. The citation's
other links are safe: "URL", "OpenAlex" and "Wikidata" pass the `url`
rule, and the Vue builds the DOI, arXiv and handle links by appending
the stored identifier to a fixed resolver address
(`citationStore.doiUrlPrefix + citation.doi`).

4730f6707e gave the DOI, arXiv and handle rules but left `orcid`
without one. `pkp/pkp-lib#11902` (2516e5a60c, "PIDs validation") made
those three rules stricter and added `wikidata` to the author item, also
without a rule.

Reach:

- "Edit citation" on the References page: the only screen that writes a
  reference's authors (walked on the three apps). The submission
  wizard's references are one free-text box.
- The background lookup saves through `Repo::citation()->edit()`
  without validating, so the rule does not cover what it writes.
  `OrcidAuthorJob` empties an author's ORCID iD when ORCID answers "not
  found", which it would for the typed address once a lookup reaches it:
  after "Add" with lookup on, or a later "Reprocess" (code). "Edit"
  starts no lookup (code).
- The REST API's citations endpoints return the value to the roles that
  may read them (code). No export carries it: the published page prints
  each reference's text, the JATS XML (`ArticleBack.php`) and the
  Crossref deposits (`ArticleCrossrefXmlFilter.php`) write reference
  authors' names only, and the PubMed and native XML exports write the
  raw text (code).
- `FieldAuthorsDisplay.vue` binds an `orcid` as a link the same way, in
  the data citation "View" window, whose creators' ORCID iDs are checked
  on save (code).

## Proposed fix

Recommended (a proposal; the team decides): give the reference author's
`orcid` the rule contributors have, in lib/pkp `schemas/citation.json`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reference-author-orcid-any-link/fix.diff)):

```diff
                     "orcid": {
-                        "type": "string"
+                        "type": "string",
+                        "validation": [
+                            "nullable",
+                            "orcid"
+                        ]
                     },
```

`PKPSchemaService::addPropValidationRules()` turns this into
`authors.*.orcid`. The refusal comes back keyed by row, and
`FieldAuthors.vue` already shows it under the row's box, as it does for
data citations. A rule in the schema covers the REST API and the screen
at once.

Tried on `main` on the three apps: step 6 shows the Expected refusal
under the box and nothing is saved. A neighbour check gave the same
result with and without the fix: one reference with three authors
(a full ORCID address, a sandbox address and an empty box) was saved,
and the first two authors got icons linking to their ORCID addresses.

**Alternatives**

- Check the address only in `CitationManagerCellCitation.vue` (render
  the link only for `https://(sandbox.)orcid.org/`): this fixes the
  link but still stores any text, and every reader of the property would
  need the same check. The Vue check is still worth adding next to the
  schema rule, with `rel="noopener noreferrer"`, because the lookup
  saves without validation.
- Validate in `PKPCitationController::edit()`: a second place to keep in
  step with the schema.

**What goes with it**

- The author item's `openAlex` and `wikidata` have no rule either. They
  are left out: no screen shows or edits them, and they are written only
  by the lookup (`openAlex` from OpenAlex's author id) or the REST API.
  Giving both `["nullable", "url"]`, as the citation-level properties
  have, would be consistent and costs nothing, but it fixes nothing a
  user meets.
- No data repair. On an install already running `main`, a citation saved
  before the fix keeps its value, and any later "Save" of that citation
  is refused until its author's ORCID iD is corrected or emptied.
- A unit test beside
  `tests/classes/dataCitation/DataCitationIdentifierValidationTest.php`:
  call `Repo::citation()->validate(null, ['authors' => [['orcid' => …]]])`
  with an off-site address, a `javascript:` value, a bare iD, a full and
  a sandbox address and an empty value, and assert on the `authors` key
  alone (a null citation also gets required-field errors for
  `publicationId`, `rawCitation` and `seq`). Also an e2e check of step
  6's refusal (a Planned item in spec U42).

Small: a schema rule that copies `author.json`, with no data repair.

## Evidence

- Kept script: `shared/playwright/checks/issues/reference-author-orcid-any-link/walk.js`
  (helpers in `lib.js`), run on a fresh load of the default dataset as
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/reference-author-orcid-any-link/walk.js steps`.
  The mode `reach` types the `javascript:` value; `nb` is the neighbour
  check. Requests to example.com are answered inside the browser.
- Walked on `main` on the three apps, on pkp/datasets 58f1d08
  (2026-10-05), PostgreSQL. No request failed and no script error was
  logged.
- The background lookup on these test installs: they cannot reach
  Crossref, OpenAlex or ORCID. In an earlier walk the reference was added
  with lookup on: its lookup stopped at Crossref, waiting to retry, and
  never reached ORCID, so the typed value survived. On an install with
  network access the lookup can reach ORCID before step 6, hence the
  precondition. In the walk of the Steps as written, no lookup was
  queued at any point.
- The fix trial ran on the earlier order (reference added with lookup
  on); the refusal comes from the save's validation, which the order does
  not change.
- 3.5: steps 1-2 walked as the author and as `dbarnes` on the three apps;
  "References" is one text box, with no table, "Author Information" or
  ORCID box. 3.4 and 3.3 read in the code: lib/pkp
  `origin/stable-3_4_0` and `origin/stable-3_3_0` have only the raw-text
  `Citation` and `PKPCitationsForm`, their ui-library no CitationManager,
  and 4730f6707e is on neither (nor on `stable-3_5_0`).
- Tips: `main` OJS 1f4cef786f, OMP a989fdc37, OPS caddbb33da, lib/pkp
  a7f5e3081b, lib/ui-library 64d67363 (OJS) and 280f98c5 (OMP, OPS; the
  same lines). 3.5: OJS 4342473090, OMP 9c5e24246, OPS 38b61882d3,
  lib/pkp 771474347e (OJS) and cf3f984335 (OMP, OPS), lib/ui-library
  d4e01883. 3.4: OJS d68934d0d1, OMP 0aec65441, OPS acd8ae704b, lib/pkp
  767353f4fe. 3.3: OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161, lib/pkp
  ac3fa73402.
- Not driven: a section editor or assistant pressing the icon (the same
  page, by code); the author typing the value before "Submit", which no
  screen offers.
- Unverified: Firefox and Safari; a lookup on an install with network
  access (the order of its jobs and ORCID's answer are read from the
  code).
