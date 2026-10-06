# An author can submit with no data citations when the journal requires them

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no data citations)
  - 3.4: none (code; no data citations)
  - 3.3: none (code; no data citations)
- **Introduced** `pkp/pkp-lib#12079` for `pkp/pkp-lib#6278` · [bd6bebd1fa](https://github.com/pkp/pkp-lib/commit/bd6bebd1faa00435910c67ee46fb1d7eb7298f00) · 2026-02-13 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U42 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U42-citations-and-references.md#a9)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When a manager sets data citations to "Require the author to add data
citation metadata…", a submission without one is expected to be held
back. The author's "Review" step shows "Data citations are required.",
but "Submit" stays enabled and the submission completes. Required
references, by contrast, do stop it.

The journal, press or server then receives submissions without the
data citations it requires.

## Impact

- **Lost**: the requirement itself. Each such submission goes in as
  if complete, and only the author, who saw the warning, is told.
- **Who**: every author on a journal, press or server whose manager
  chose "Require…" for data citations, a setting that is off by
  default.
- **Way round**: an editor opens the submission's "Data" page and adds
  the data citations or asks the author for them.

Medium: in every context that chooses "Require…", the requirement
holds back no submission; the author gets only a notice, the editors
are not told, and the way round is a manual check of each submission.
It would be high if the missing data citations could not be added
afterwards.

## Steps to reproduce

Preconditions:

- The default dataset, OJS, OMP or OPS `main`. It leaves "Data
  Citations" switched off and "References" at "Ask the author to
  provide references during submission.".

Requiring data citations:

1. Sign in as `rvaca`.
2. Open Settings › Workflow › Submission › "Metadata".
3. Under "Data Citations", tick "Enable data citation metadata", choose
   "Require the author to add data citation metadata before accepting
   their submission." and press "Save".

Submitting without one:

4. Sign out and sign in as `ccorino` (OMP: `aclark`).
5. Open "Make a Submission" (`/index.php/publicknowledge/en/submission`),
   type the title "u42r1 no data citation", choose the section
   "Articles" (OPS: "Preprints"; OMP: none), tick the requirement boxes
   and press "Begin Submission".
6. On "Upload Files", upload a manuscript (OPS: "Add File", label "PDF")
   and press "Continue".
7. On "Details", type an abstract. The "Data" section's "Data
   Citations" table reads "No data citations have been added."; leave
   it and press "Continue".
8. Press "Continue" on each step up to "Review" (OMP: on "For the
   Editors" choose the series "Library & Information Studies" first;
   OPS: on "For Readers" answer "Relation status" first).
9. On "Review", read the "Details" panel and the footer.
10. Press "Submit", then "Submit" in the confirmation.

**Expected**: at step 9 the problems banner "There are one or more
problems that need to be fixed before you can submit. …" shows, the
"Data Citations" item says "Data citations are required.", and "Submit"
is disabled until a data citation is added.

**Observed**: the "Data Citations" item reads "Data citations are
required." above "None provided", but no banner shows and "Submit" is
enabled. Step 10 lands on "Submission complete". The Review step's
check (`PUT …/api/v1/submissions/{id}/submit` with `_validateOnly`)
answered `200 []`.

Control: after `rvaca` also sets "References" to "Require the author
to provide references before accepting their submission.", a second
submission "u42r1 no references" taken through steps 5–9 with the
References box empty shows the banner and "This field is required."
above "References", the same check answers 400
`{"citationsRaw":["This field is required."]}`, and "Submit" is
disabled.

## Cause

`PKP\submission\Repository::validateSubmit()`
(`lib/pkp/classes/submission/Repository.php`, lines 439–462) checks
each property `Context::getRequiredMetadata()` returns, `dataCitations`
among them, with one test for all:

```php
if (empty($schema->multilingual) && empty((string) $publication->getData($metadata))) {
```

The `(string)` cast came with c5c583d415 (`pkp/pkp-lib#11715`). It
lets the check test `citationsRaw`, an object that implements
`Stringable`, by its text. But a list cast to a string is never empty,
even when it holds no item. `dataCitations` has been a `LazyCollection`
since 146db80191, set in `publication\DAO::fromRow()` since c82f51d762,
and an empty one casts to the JSON text `"[]"`. Before that it was a
PHP array, which casts to `"Array"`. So `validateSubmit()` never reports
a missing data citation, and the submit endpoint, which takes its field
errors from that method, has none to refuse with.

"Data citations are required." is a notice that
`templates/submission/review-details.tpl` shows in the browser when
`publication.dataCitations` is empty, and it does not disable "Submit".
So no error for a missing data citation comes from either side: the
browser only warns, and the server's check answers with none.

Reach:

- The same endpoint is the REST API's `PUT submissions/{id}/submit`,
  so an API client is not stopped either (code).
- The other list-valued required properties, the multilingual
  `keywords`, `subjects`, `disciplines` and `supportingAgencies`, go
  through the same cast. They are refused correctly when empty, because
  `getData($metadata, $locale)` then gives `null`, but a filled one
  casts an array, which raises the PHP warning "Array to string
  conversion" at every such submit (code).
- Funders are not reached: `validateSubmit()` skips `funders` in this
  loop and checks `$submission->getData('funders')->isEmpty()` before
  it (code).

## Proposed fix

Proposed: let the loop judge a list as empty when it holds no item,
and keep the text test for everything else:

```diff
--- a/lib/pkp/classes/submission/Repository.php
+++ b/lib/pkp/classes/submission/Repository.php
@@ -454,10 +454,20 @@
             if (!$schema) {
                 continue;
             }
-            if (empty($schema->multilingual) && empty((string) $publication->getData($metadata))) {
-                $errors[$metadata] = [__('validator.required')];
-            } elseif (!empty($schema->multilingual) && empty((string) $publication->getData($metadata, $locale))) {
-                $errors[$metadata] = [$locale => [__('validator.required')]];
+            $value = empty($schema->multilingual)
+                ? $publication->getData($metadata)
+                : $publication->getData($metadata, $locale);
+            // A list (data citations, keywords) is empty when it holds no item;
+            // anything else (a string, the Stringable citationsRaw) when its text is empty
+            $isEmpty = match (true) {
+                $value instanceof Enumerable => $value->isEmpty(),
+                is_array($value) => empty($value),
+                default => empty((string) $value),
+            };
+            if ($isEmpty) {
+                $errors[$metadata] = empty($schema->multilingual)
+                    ? [__('validator.required')]
+                    : [$locale => [__('validator.required')]];
             }
         }
 
```

([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/submits-without-required-data-citations/fix.diff).)
The fix stays in the one loop every required property goes through, so
a list-valued property added later is covered too. It follows the
funders check just above it, which asks the collection `isEmpty()`.
`Enumerable` is already imported in the file. No other property
`getRequiredMetadata()` can return (`keywords`, `subjects`,
`disciplines`, `supportingAgencies`, `coverage`, `rights`, `source`,
`type`, `citationsRaw`, `dataAvailability`, `fundingStatement`) changes
outcome with the fix; the keyword lists only lose the PHP warning.

Tried on `main`, all three apps: with the fix, step 9's "Review" shows
the problems banner, the check answers 400
`{"dataCitations":["This field is required."]}`, "Submit" is disabled
and the draft stays unsubmitted. A submission with one data citation
reaches "Review" with no problem and submits, with the fix and without
it.

With the fix, the server's `dataCitations` error is not shown at the
"Data Citations" item, which keeps its own notice, "Data citations are
required.". That is enough: the banner and the disabled "Submit" hold
the submission back, and the notice already says what is missing, so
the template needs no change.

**Alternatives**:

- A `dataCitations` branch beside the funders one: it closes this
  fault, but leaves the cast wrong for the next list and the warning
  for the keyword lists.
- Disable "Submit" in the browser while the notice shows: the REST API
  would still let the submission through, and the wizard has no other
  check of its own in the browser.

**What goes with it**:

- No stored data to repair: the check runs only at submit, and
  submissions already in are not checked again.
- REST API: `PUT submissions/{id}/submit` now answers 400 with a
  `dataCitations` error when the context requires data citations and
  the publication has none; no released version has data citations, so
  no client relies on the old answer and nothing needs a backport.
- Guard: a Planned e2e item in the Citations & references spec:
  "Require…" stops a submission with no data citation. lib/pkp has no
  `validateSubmit()` test to extend; a first one needs a database
  fixture or mocks of the context, the submission, its publication and
  `GenreDAO` (the method reads the required file types from the
  database), about half a day of scaffolding, so it is a follow-up the
  team may add rather than part of this fix.

Small: one loop in one pkp-lib method, following the funders check
beside it, guarded by the e2e item.

## Evidence

- Script that takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/submits-without-required-data-citations/walk.js),
  with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/submits-without-required-data-citations/lib.js),
  run on an install loaded from the default dataset:
  `node bin/probe.js <ojs|omp|ops> shared/playwright/checks/issues/submits-without-required-data-citations/walk.js`.
  The check that a submission with a data citation still goes in is
  the same script with `MODE=neighbour` in front, run with the fix
  applied and without it: steps 1–6, then on "Details" "Add Data
  Citation" with the title "u42r1 ocean dataset" and the relationship
  "supporting", "Save", a reload (needed on a press or a preprint
  server, U42
  [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U42-citations-and-references.md#a10)),
  "Continue" from "Upload Files", then the abstract and steps 8–10.
- Tips walked: `main`: OJS ff004d0973 (pkp-lib 987776cd04, ui-library
  64d6736318), OMP 3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6,
  ui-library 280f98c570). pkp/datasets 566bb1f (2026-10-03).
  PostgreSQL; the fault does not depend on the database.
- Stored state after step 10, all three apps: the new submission's
  `status` 1 (queued) with an empty `submission_progress` (submitted)
  and no `data_citations` row for its publication.
- The casts, checked with the checkout's own vendor code on PHP 8.3:
  an empty `LazyCollection` casts to `"[]"` and `empty()` gives false;
  `(string) []` gives `"Array"` with "Array to string conversion".
- 3.5 (code): `stable-3_5_0` OJS c1cee76b95 (pkp-lib 771474347e), OMP
  9c5e24246c and OPS 38b61882d3 (pkp-lib cf3f984335): no data citations
  (no match for "datacitation" in pkp-lib's `classes`, `schemas`,
  `templates`, `pages` or `api`; `Context::getRequiredMetadata()` has no
  `dataCitations`), so no walk.
- 3.4 and 3.3 (code): pkp-lib `origin/stable-3_4_0` 767353f4fe and
  `origin/stable-3_3_0` ac3fa73402 hold no data citations either (no
  match for "datacitation" in `classes`, `schemas` or `templates`).
- Introduced: `git blame` on line 457 gives c5c583d415 (Alec Smecher,
  2025-08-20, `pkp/pkp-lib#11715` for `pkp/pkp-lib#11682`), which added
  the cast for `citationsRaw`. The properties checked then were strings
  and multilingual arrays, and the check still gave the right answer
  for them, because a language with no entries gives `null`. `dataCitations` joined `getRequiredMetadata()` in
  ff75352c87 ("Data Citations preliminary work", 2025-04-16), when the
  publication carried no data citations yet. bd6bebd1fa
  ("pkp/pkp-lib#6278 Implement Data Citations support", merged through
  `pkp/pkp-lib#12079` on 2026-02-14) made the property a list, from
  which point the check could never report a missing data citation.
  146db80191 (Alec Smecher, 2026-08-17, `pkp/pkp-lib#13003`) made the
  list a `LazyCollection`, and c82f51d762 (2026-08-19) moved it into
  `fromRow()`, with the same outcome; `git show` of each.
- Upstream: searched 2026-10-04 on pkp/pkp-lib, pkp/ojs, pkp/omp,
  pkp/ops and pkp/ui-library; `pkp/pkp-lib#6278`, `#12079` and
  `#12993` concern data citations but not this check.
