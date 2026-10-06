# A DOI in a reference typed while submitting is not recorded as its DOI when metadata lookup is off

- **Severity** medium
- **Effort** small
- **Kind** intention gap
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no DOI is taken from a reference's text)
  - 3.4: none (code; no DOI is taken from a reference's text)
  - 3.3: none (code; no DOI is taken from a reference's text)
- **Introduced** `pkp/pkp-lib#12348` for `pkp/pkp-lib#12104` · [3b5a1ae5](https://github.com/pkp/pkp-lib/commit/3b5a1ae55c130cebb30bc0a0380a889b625a2094) · 2026-02-16 · Božana Bokan (bozana)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U42 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U42-citations-and-references.md#a7)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

With "References Metadata Lookup" off, an author who types a reference
with its DOI into the "References" box while submitting gets the
reference saved with the DOI in its text only, not recorded as the
reference's DOI. The same reference added later through "Add" on the
References page gets its DOI recorded. Nothing on screen differs until a
manager switches the lookup on. Then only the added reference shows its
DOI as a link and in the "DOI" box of "Edit".

A journal's Crossref deposit sends the typed reference as plain text
instead of as its DOI, and nobody is told.

Lookup is off and references are requested by default, so this reaches
every reference an author types with a DOI while submitting.

## Impact

- **Lost**: the reference's DOI as a recorded identifier. The text still
  holds it, so readers see the same reference.
- **Who**: every journal, press and preprint server that asks for
  references and leaves the lookup off, for each reference an author
  types with a DOI. A journal that deposits with Crossref sends those
  references as text. A press (no Crossref plugin) and a preprint server
  (its Crossref deposit sends no references) lose only the DOI link,
  the "DOI" box and the `doi` the REST API returns.
- **Way round**: with the lookup off, only deleting the reference and
  adding it again through "Add". With the lookup on, "Edit" offers a
  "DOI" box and the row offers "Reprocess".

Medium: a journal's Crossref deposit sends each such reference as text
instead of as `<doi>`, a wrong field in an output that goes to the
world. It stays below high because the DOI still travels
inside the text, and after a deposit the plugin can store a DOI that
Crossref matched to it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, `publicknowledge`. It asks for
  references ("References" in the "Details" step), and "References
  Metadata Lookup" is off.

Submitting:

1. Sign in as `ccorino` (OMP: `aclark`).
2. "New Submission": "Submission Language" English, title "u42r8 DOI in
   references", "Section" "Articles" (OMP: "Submission Type"
   "Monograph"; OPS: no section to choose), tick "Yes, my submission
   meets all of these requirements." and "Yes, I agree to have my data
   collected and stored according to the privacy statement.", "Begin
   Submission".
3. "Upload Files": upload a file (OPS: add a PDF galley).
4. "Details": type an abstract, and in "References" type
   `Alpha study 2020. https://doi.org/10.1234/abcd`.
5. "Continue" to "Review" (it lists the reference under "References"),
   then "Submit" and confirm.

Adding:

6. Sign in as `dbarnes` and open the new submission (OJS 21, OMP 19,
   OPS 20); Publication (OPS: Preprint) › "References".
7. In the box above the list type
   `Beta trial 2021. https://doi.org/10.1234/efgh` and press "Add".
8. Look at the two rows.

Switching lookup on:

9. Settings › Workflow › "Metadata": tick "Enable references
   structuring and metadata lookup", "Save".
10. Open the submission's "References" again. Look at the two rows and
    open "Edit" on each.

**Expected.** Both references have their DOI recorded. At step 10 both
rows show it as a link ("10.1234/abcd", "10.1234/efgh"), and "Edit"
shows it in "DOI".

**Observed.** At step 8 the two rows read alike: each shows its text
only. At step 10 "Beta trial" shows the link "10.1234/efgh" above its
text and "10.1234/efgh" in "DOI". "Alpha study" shows no link, and its
"DOI" box is empty. The publication the References page loads (`GET
…/submissions/21/publications/22` on OJS) carries the difference from
step 7 on, before the lookup is switched on:

```json
"citations": [
  {"rawCitation": "Alpha study 2020. https://doi.org/10.1234/abcd", "doi": null},
  {"rawCitation": "Beta trial 2021. https://doi.org/10.1234/efgh", "doi": "10.1234/efgh"}
]
```

The same on OMP and OPS. Nothing failed: no server error, no script
error.

## Cause

`PKP\citation\Repository::importCitations()` finds the DOI but never
writes it
([Repository.php L244-L253](https://github.com/pkp/pkp-lib/blob/987776cd043efac8c4a1693560a6d7737d174210/classes/citation/Repository.php#L244-L253)).
Each line of the list is inserted with `$this->dao->insert($citation)`
first. Only afterwards, when lookup is off, the DOI is read from the
text with `Doi::extractFromString()` and set on the object with
`$citation->setData('doi', $doi)`. Nothing saves the object again, so
the DOI lives only in memory until the request ends.

The wizard reaches this method through the publication's save: the
"Details" step PUTs `citationsRaw`, and `publication\DAO::update()`,
when it is passed the old publication, calls `importCitations()` with
the box's text. That method rebuilds the list only when the text
differs from the stored references.

The sibling `importAdditionalCitations()`, behind "Add", has the same
lines and ends them with `Repo::citation()->edit($citation, [])`, which
writes the DOI. 3b5a1ae5 added both, to keep a reference's DOI when the
lookup is off, as `pkp/pkp-lib#12315` asked; only the "Add" path got the
save. (`pkp/pkp-lib#12104` is the umbrella issue the change was filed
under, `pkp/pkp-lib#12348` its pull request.)

Reach:

- Every caller of `importCitations()` with lookup off (code): the
  wizard's "Details" save, a new publication created with
  `citationsRaw` (`publication\DAO::insert()`), a REST API client that
  PUTs `citationsRaw`, the Native XML import
  (`NativeXmlPKPPublicationFilter`, which passes its
  `citation-metadata-lookup` option as the third parameter,
  `$reprocess`) and `lib/pkp/tools/parseCitations.php`.
- OJS Crossref deposit (code, and the plugin's builder run on the
  walked article): `ArticleCrossrefXmlFilter::appendCitationListNode()`
  in `pkp/crossref-ojs` writes `<doi>` for an unstructured reference that
  has one, `<unstructured_citation>` with the text otherwise. Each `key`
  is the citation's ID, here the walk's 1 and 2:

  ```xml
  <citation key="1">
    <unstructured_citation>Alpha study 2020. https://doi.org/10.1234/abcd</unstructured_citation>
  </citation>
  <citation key="2">
    <doi>10.1234/efgh</doi>
  </citation>
  ```

- The fetch-back after a deposit (code): when a single-submission
  deposit's answer carries `citations_diagnostic`, an hourly task
  (`CrossrefCitationDoiHandler::processPendingCitationDois()`) asks
  Crossref about every citation of the publication without a stored
  DOI, and stores the DOI Crossref *matched*, which need not be the one
  typed, with `Repo::citation()->edit()`, once per deposit. It covers
  only published publications that have a DOI, on OJS only.
- The References page (walked): the DOI link and the "DOI" box of
  "Edit" read the stored `doi` once the lookup is on.
- Not reached (code): the JATS XML writes an unstructured reference as
  its text alone (`ArticleBack`, `<mixed-citation>`); the article page
  links DOIs found in the text and adds a stored one only when the text
  holds none (`CrossrefCitationDoiHandler::displayReferenceDOI()`);
  the OPS Crossref deposit and DataCite send no references.
- With lookup on, `importCitations()` queues the lookup jobs instead,
  and `ExtractPidsJob` stores the DOI (walked: on the dataset's install,
  which runs jobs on web requests, the reference got its DOI).

## Proposed fix

Set the DOI before the insert, which writes it with the other settings
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-reference-doi-not-kept/fix.diff),
`lib/pkp/classes/citation/Repository.php`):

```diff
                         $citation->setProcessingStatus(CitationProcessingStatus::NOT_PROCESSED->value);
-                        $newCitationId = $this->dao->insert($citation);
-                        $citation->setId($newCitationId);
-                        if ($citationsMetadataLookup && $reprocess) {
-                            $this->reprocessCitation($citation);
-                        } elseif (!$citationsMetadataLookup) {
+                        if (!$citationsMetadataLookup) {
+                            // Without the lookup, keep the DOI written in the text: set it before
+                            // the insert, which writes it with the other settings.
                             $rawString = str_ireplace('http://', 'https://', $rawCitationString);
                             $doi = Doi::extractFromString($rawString);
                             if (!empty($doi)) {
                                 $citation->setData('doi', $doi);
                             }
                         }
+                        $newCitationId = $this->dao->insert($citation);
+                        $citation->setId($newCitationId);
+                        if ($citationsMetadataLookup && $reprocess) {
+                            $this->reprocessCitation($citation);
+                        }
```

The fix sits where the list is built, so every caller above is covered,
and it keeps the intent of 3b5a1ae5: the DOI is taken from the text
only while the lookup is off. One write per reference, as before. Tried
on all three apps: with it, the walk shows the Expected (both rows link
their DOI at step 10, both stored, and the OJS `<citation_list>` gives
both as `<doi>`). A second walk with the lookup on before submitting,
one line with a DOI and one without, stored and showed the same with
the fix in and out: the DOI line got its DOI from the lookup job, the
other none.

**Alternatives**

- Add `$this->dao->update($citation)` after `setData('doi', …)`, as
  "Add" does with `edit()`: a second write per reference for the same
  result.
- Move both methods' DOI step into one helper used before each insert,
  dropping `importAdditionalCitations()`'s extra `edit()`: tidier, but it
  touches the path that works; worth doing with the fix if the team
  prefers one place.

**What goes with it**

- References already stored without a DOI stay empty after the fix.
  Saving the same wizard text again, or running
  `tools/parseCitations.php`, skips a list whose text is unchanged. They
  get their DOI only if the lookup is switched on ("Reprocess", or
  "Edit" and the "DOI" box).
- What changes for others: the REST API now returns the `doi` of such
  references. The `Citation::importCitations::after` hook already
  received it on the in-memory objects, so plugins see no change.
- Left out: a Native XML import into a journal with the lookup on but
  run with its `citation-metadata-lookup` option off still stores no
  DOI, as neither branch runs; that is a choice about the import's
  option, not this fault.
- A unit test of `importCitations()` with lookup off and a line holding
  `https://doi.org/…`, reading the stored citation back.

Small: a few lines moved in one shared method, tried on the three apps,
and a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-reference-doi-not-kept/walk.js)
  (helpers in `lib.js` beside it) takes the Steps on PKP's default test
  dataset, freshly loaded:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/wizard-reference-doi-not-kept/walk.js`;
  `MODE=nb` instead switches the lookup on first and submits one line
  with a DOI and one without.
- Read outside the screens: the stored `citation_settings` rows of the
  two references, and on OJS the `<citation_list>` above, built by
  [citationlist.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-reference-doi-not-kept/citationlist.php)
  with the plugin's own `appendCitationListNode()` on the walked
  article, since "Export DOIs" needs crossref.org's schema, which a test
  install cannot fetch. Nothing was deposited or published.
- Walked on `main`, PostgreSQL, pkp/datasets 566bb1f (2026-10-03), at
  OJS ff004d0973 (lib/pkp 987776cd04, ui-library 64d67363, crossref
  plugin 46a4d469), OMP 3b0ecf794 and OPS c8af945bb7 (lib/pkp
  3dc90c81a6, ui-library 280f98c5). `classes/citation/Repository.php` is
  the same in the three checkouts. MySQL not checked; nothing here
  depends on the database.
- Older versions (code; 3.5 not walked, as it has no References page
  with "Add" or a lookup to switch on): `stable-3_5_0` OJS c1cee76b95
  (lib/pkp 771474347e), OMP 9c5e24246 and OPS 38b61882d3 (lib/pkp
  cf3f984335); lib/pkp `origin/stable-3_4_0` 767353f4fe and
  `origin/stable-3_3_0` ac3fa73402, OJS `upstream/stable-3_4_0`
  d68934d0d1 and `upstream/stable-3_3_0` ac77c9fb35.
  `CitationDAO::importCitations()` stores each line as raw text and
  nothing reads a DOI from it; there is no "Add".
- Upstream: `pkp/pkp-lib`, `pkp/ojs` and `pkp/ui-library` searched on
  2026-10-04 for a reference's DOI with lookup off or not saved, and for
  `importCitations`; `pkp/pkp-lib#12104`, `#12315`, `#13208` (the list
  comparison in the same method) and `#11270` read: none reports this.
- Unverified: whether Crossref's matching finds the DOI written in an
  `<unstructured_citation>`, and so whether the fetch-back ever stores
  it; no test install reaches Crossref.
