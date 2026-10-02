# Publishing a book with only monograph URNs shows a one-row URN table instead of the URN sentence

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#1396` for `pkp/pkp-lib#8940` · [87e5cd62b3](https://github.com/pkp/omp/commit/87e5cd62b39ed1156eb10a88f04877d31ba585d0) · 2023-04-26 · Bozana Bokan (bozana); on 3.3 its backport `pkp/omp#1398` · [a6305abd76](https://github.com/pkp/omp/commit/a6305abd7613d044e317299b40a14929b9a0055d) · 2023-05-10
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U44 [OMP4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#omp4)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A press can choose to assign URNs to monographs only: in the URN
plugin's settings, "Monographs" is then the only box ticked under
"Press Content". The settings window opens with no box ticked, so this
is the press's own choice, not a default. When an editor at such a press
clicks "Publish", the window shows a table headed "URN" and "Item" with
one row, "Publication", reading "Unassigned" or the book's URN.

The window is meant to show one line instead: the warning "A URN has
not been assigned to this publication." when the book has no URN yet,
or "The URN for this publication will be …" when it has one. A journal
with only "Articles" ticked gets that line, and a monographs-only press
got it too until a 2023 change to the plugin. The fix is one condition
in OMP's URN plugin.

## Impact

- **Lost**: nothing. The table holds the same facts as the line, and
  the book is published as usual.
- **Who**: an editor publishing any book at a press whose URN settings
  tick only "Monographs", on every publish.
- **Way round**: none needed.

Low: only the way the window presents the URN changes.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OMP. The "URN" plugin is off
  in the dataset. Submission 4, "How Canadians Communicate: Contexts of
  Canadian Popular Culture", is in Production, unpublished, with
  `dbarnes` assigned.

Steps:

1. Sign in as `dbarnes`.
2. Open Settings › Website › "Plugins". Under "Public Identifier
   Plugins", tick "Enabled" on the "URN" row.
3. Click the "URN" row's arrow, then "Settings". Under "Press Content",
   tick "Monographs" only. Fill "URN Prefix" with `urn:nbn:de:0000-`,
   choose `urn:nbn:de` as "Namespace", fill "Resolver URL" with
   `https://nbn-resolving.de/`, and click "Save".
4. Open submission 4's workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=4`)
   and, in its side menu, Publication › "Title & Abstract".
5. Click "Publish" at the top right. Read the window, then close it with
   "Close" without publishing.
6. In the side menu open "Identifiers", click "Assign" next to "URN",
   then "Save".
7. Click "Publish" again, read the window, and close it with "Close".

**Expected**: step 5's window shows the warning "A URN has not been
assigned to this publication."; step 7's window reads "The URN for this
publication will be urn:nbn:de:0000-jpk.4."

**Observed**: both windows show a table instead:

```
URN                      Item
⚠ Unassigned             Publication        (step 5)
urn:nbn:de:0000-jpk.4    Publication        (step 7)
```

## Cause

`URNPubIdPlugin::addPublishFormNotice()` in OMP's
`plugins/pubIds/urn/URNPubIdPlugin.php` adds the URN part of the publish
window. It has three branches: nothing enabled (no notice), the
publication only (the one line), anything else (the table). The second
branch's test, line 384 on `main`, can never be true:

```php
} elseif ($publicationFormatUrnEnabled && !$chapterUrnEnabled && !$publicationFormatUrnEnabled && !$submissionFileUrnEnabled) {
```

It asks for `$publicationFormatUrnEnabled` and `!$publicationFormatUrnEnabled`
at once, so every enabled setup falls through to the table, the
monograph-only one included. Its comment ("Use a simplified view when
only assigning to the publication") and OJS's twin
(`elseif (!$galleyUrnEnabled)`) show the intent: the publication alone.

The line came with 87e5cd62b3 (`pkp/pkp-lib#8940`, "Publish preview in
OMP does not consider all objects"). Before it, OMP ran a copy of OJS's
method: the one-line branch was taken whenever formats were off, so a
monographs-only press got the line, and the table's second loop, under
the format setting, walked the publication's galleys, which OMP does not
have. The change replaced that loop with chapter, format and file rows
and the branch's test with a four-kind test whose first term names
formats where the publication was meant.

Reach:

- No setup reaches the one-line branch. "Monographs" alone is the only
  setup that should and so gets the table by mistake; every other
  setup with a box ticked is meant to get the table (code; two of them
  walked, below).
- No other form or screen goes through this method. OJS's own method
  takes its one-line branch for "Articles" alone (walked on `main`).
  OPS has no URN plugin.

## Proposed fix

Take the one-line branch when chapters, formats and files are all off,
as OJS's method takes it when galleys are off
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-publish-window-urn-table/fix.diff)):

```diff
-        } elseif ($publicationFormatUrnEnabled && !$chapterUrnEnabled && !$publicationFormatUrnEnabled && !$submissionFileUrnEnabled) {
+        } elseif (!$chapterUrnEnabled && !$publicationFormatUrnEnabled && !$submissionFileUrnEnabled) {
```

The branch above has already returned when nothing is enabled, so
"none of the other three" means "the publication alone". Tried on OMP
`main`: step 5's window now shows "A URN has not been assigned to this
publication." and step 7's "The URN for this publication will be
urn:nbn:de:0000-jpk.4.". Two setups that must keep the table do, the
same with and without the fix: "Monographs" and "Publication Formats"
ticked (rows "Publication" and "Publication Format: PDF"), and
"Publication Formats" alone (the "Publication Format: PDF" row only).

**Alternatives**:

- `$publicationUrnEnabled && !$chapterUrnEnabled && …`, the likely
  intended spelling: the same result, with a term the branch above
  already guarantees.

**What goes with it**:

- Backport: the diff applies as it stands on `stable-3_5_0` and
  `stable-3_4_0`. On `stable-3_3_0` the same test sits in
  `URNPubIdPlugin.inc.php` as `} else if (…)`, tab-indented, and the
  one-line change is made by hand.
- Guard: an e2e scenario in pkp-e2e's spec U44 that publishes with
  "Monographs" alone and reads the line.

Small: one condition in OMP's URN plugin, and an e2e check.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-publish-window-urn-table/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-publish-window-urn-table/lib.js),
  run with `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all
  shared/playwright/checks/issues/press-publish-window-urn-table/walk.js`
  on an install reset to the default dataset (its header gives the
  reset and the 3.5 commands). It takes Steps 1 to 7 on OMP and the
  "Articles" control on OJS. `WALK=neighbour` publishes with
  "Monographs" and "Publication Formats" ticked, then "Publication
  Formats" alone, and reads the window each time. The fix was tried with
  `node bin/try-fix.js apply …/fix.diff omp`, the steps and the
  neighbour walked with the fix in, the neighbour again with it out,
  then reverted.
- Walked on `main` and `stable-3_5_0` (OMP), on PostgreSQL, the default
  dataset from pkp/datasets c657990 (2026-10-01); the OJS control on
  `main` (it went through "Review Publishing Details" with "Version of
  Record", "Assign To Current/Back Issue" and "Vol. 1 No. 2 (2014)",
  then closed the window): with the URN plugin enabled on OJS as in
  steps 2 and 3 but "Articles" the only box ticked under "Journal
  Content", "Schedule For Publication" on OJS submission 5 shows "A URN
  has not been assigned to this publication." On 3.5 the script did not
  find OJS's window; OJS's method there is the `main` one (code). MySQL not checked (the branch reads plugin settings only).
- Tips: OMP `main` 3b0ecf794c (lib/pkp 3dc90c81a6), OJS `main`
  b84f8e2e44; OMP `stable-3_5_0` 9c5e24246c (lib/pkp cf3f984335), OJS
  `stable-3_5_0` 091fb65453; OMP `stable-3_4_0` 0aec65441f;
  OMP `stable-3_3_0` 8e72fc8836.
- Code reads: `URNPubIdPlugin::addPublishFormNotice()` of OMP on `main`
  (line 384), 3.5 (line 384) and `stable-3_4_0` (line 387), and of
  `URNPubIdPlugin.inc.php` on `stable-3_3_0` (the `} else if` of the
  same method): the same test on all four; the hook is registered on
  `Form::config::before` on all four. The settings form's
  `initData()` reads only stored settings, so the window opens with no
  box ticked.
- Trace: `git blame` on line 384 gives 87e5cd62b3. `git log -S` on the test gives 87e5cd62b3
  on `main`, `stable-3_4_0` and `stable-3_5_0`, and a6305abd76 on
  `stable-3_3_0`, whose parent has the same OJS-style branch.
- Upstream search 2026-10-02, pkp/pkp-lib, pkp/omp and pkp/ui-library,
  issues and PRs: "URN publish preview", "URN publish table monograph",
  "URN publish", "addPublishFormNotice", "URN for this publication will
  be", "URN simplified view", "URN", "publicationFormatUrnEnabled", "URN
  OMP publish", "URN not been assigned", "URN plugin OMP". The nearest,
  `pkp/pkp-lib#8940` (the change above, closed) and `pkp/ui-library#502`
  (the table's styling), are not this fault.
- Unverified: none.
