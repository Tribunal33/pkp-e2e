# Publishing a book on a press that gives URNs to monographs alone shows a one-row table, not one line

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#1396` for `pkp/pkp-lib#8940` · [87e5cd62](https://github.com/pkp/omp/commit/87e5cd62b39ed1156eb10a88f04877d31ba585d0) · 2023-04-26 · Bozana Bokan (bozana); on 3.3 by its backport in `pkp/omp#1398` · [a6305abd](https://github.com/pkp/omp/commit/a6305abd7613d044e317299b40a14929b9a0055d)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U44 [OMP4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#omp4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A press can have the URN plugin give URNs to monographs and to nothing
else, with "Monographs" the only box ticked under "Press Content". When
an editor presses "Publish" on a book, the confirmation window shows a
small table headed "URN" and "Item", with a single row, "Publication".
Up to OMP 3.3.0-14, the window showed one line in this setup: "The URN
for this publication will be {urn}.", or the highlighted warning "A URN
has not been assigned to this publication.". OJS still shows that line
to a journal that ticks only "Articles".

When the book has no URN yet, the table marks it with a small warning
sign beside "Unassigned" instead of the highlighted box. In either
layout the window only warns, and the book can still be published. With
more than one kind ticked, the table is the intended view and lists
every item.

## Impact

- **Lost.** Nothing. A missing URN is easier to overlook, since it is
  marked by a small sign in a table cell.
- **Who.** An editor or manager who publishes a book on a press that
  has the URN plugin on (off by default) with only "Monographs" ticked.
  It shows each time a book version is published.
- **Way round.** None needed: the table gives the same information.

Low: a layout change in a confirmation window. It would be medium if the
weaker warning led presses to publish books without their URN; no such
case is known.

## Steps to reproduce

Preconditions:

- The default dataset, OMP `main`. The URN plugin is off in the
  dataset; turning it on is part of the steps.
- Submission 4, "How Canadians Communicate: Contexts of Canadian Popular
  Culture" (in Production, not yet published) is the book used.

Settings:

1. Sign in as `rvaca` (Press manager).
2. Open Settings › Website, tab "Plugins". In the "URN" row, tick the
   box to enable the plugin.
3. Open the row's "Settings". In the window "URN", under "Press Content",
   tick "Monographs" only. "URN Prefix": `urn:nbn:de:0000-`. "URN
   Suffix": leave "Use default patterns." selected. "Namespace":
   "urn:nbn:de". "Resolver URL": `https://nbn-resolving.de/`. Press
   "Save".

Without a URN:

4. Open submission 4 and go to its "Publication" area, "Title &
   Abstract" (3.5: the "Publication" tab).
5. Press "Publish". The window "Schedule For Publication" opens with
   "All publication requirements have been met. Are you sure you want to
   make this catalog entry public?". Read what follows about the URN.
6. Close the window without publishing.

With a URN:

7. In the "Publication" area open "Identifiers". In the "URN" box press
   "Assign" (it fills in `urn:nbn:de:0000-jpk.4`), then "Save".
8. Press "Publish" again and read the URN part of the window.
9. Close the window without publishing.

**Expected:** at step 5, one warning line, "A URN has not been assigned
to this publication."; at step 8, "The URN for this publication will be
urn:nbn:de:0000-jpk.4.".

**Observed:** at step 5, a table with a single row:

```
URN             Item
⚠ Unassigned    Publication
```

At step 8, the same table:

```
URN                     Item
urn:nbn:de:0000-jpk.4   Publication
```

Control, on a fresh load (before any URN is assigned): steps 1–5 with
"Publication Formats" also ticked at step 3. The table rightly lists
"Publication" and "Publication Format: PDF", each "Unassigned".

## Cause

OMP's `URNPubIdPlugin::addPublishFormNotice()`
(`plugins/pubIds/urn/URNPubIdPlugin.php`, line 384) picks between the
one-line notice and the table with a condition that can never hold:

```php
// Use a simplified view when only assigning to the publication
} elseif ($publicationFormatUrnEnabled && !$chapterUrnEnabled && !$publicationFormatUrnEnabled && !$submissionFileUrnEnabled) {
```

It asks for `$publicationFormatUrnEnabled` to be both true and false,
so every enabled case falls through to the table. The comment, and the
branch's body, which reads only the publication's URN, show that the
first operand was meant to be `$publicationUrnEnabled`.

Before the change named under Introduced, OMP kept the OJS plugin's
`elseif (!$galleyUrnEnabled)`. That showed the line for monographs
alone, but also, wrongly, for monographs with chapters or files. The
change made the table list chapters, publication formats and files
("Publish preview in OMP does not consider all objects", one of the
points of `pkp/pkp-lib#8940`), and in rewriting the condition made the
one-line branch unreachable.

Reach:

- The table is right in every other choice: monographs with
  publication formats, monographs with chapters, and publication
  formats alone list the rows they should (on screen).
- OJS's twin tests `elseif (!$galleyUrnEnabled)`, which is right for a
  journal's two kinds of object (checked in the code).
- OMP 3.3's DOI plugin makes the same choice correctly:
  `!$chapterDoiEnabled && !$pubFormatDoiEnabled && !$submissionFileDoiEnabled`
  (checked in the code; that plugin is gone since 3.4).
- No other plugin in OJS, OMP or OPS `main` has an
  `addPublishFormNotice()` (checked in the code).

## Proposed fix

Test the monograph's own setting in the first operand:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-publish-urn-table-instead-of-sentence/fix.diff).

```diff
-        } elseif ($publicationFormatUrnEnabled && !$chapterUrnEnabled && !$publicationFormatUrnEnabled && !$submissionFileUrnEnabled) {
+        } elseif ($publicationUrnEnabled && !$chapterUrnEnabled && !$publicationFormatUrnEnabled && !$submissionFileUrnEnabled) {
```

Tried on `main`: the Steps then show the Expected lines, and the three
other choices in Reach show the same tables as before.

**Alternatives:**

- Drop the first operand, as OMP 3.3's DOI plugin does
  (`!$chapterUrnEnabled && !$publicationFormatUrnEnabled && !$submissionFileUrnEnabled`).
  It behaves the same, since the branch above has already returned when
  nothing is ticked. Either is fine; the recommended form is the
  smaller diff.
- Always show the table and remove the one-line branch: it would lose
  the highlighted warning for a missing URN and differ from OJS. That is
  a product choice the fault does not call for.

**What goes with it:**

- No stored data, API or hook changes.
- The diff applies as written to `stable-3_5_0`. On `stable-3_4_0` it is
  the same one-line edit at line 387 (the comment above it is indented
  differently, so the hunk does not apply as it stands), and on
  `stable-3_3_0` the same one-line edit in `URNPubIdPlugin.inc.php`,
  line 415.
- A guard: a check in pkp-e2e's
  [identifiers spec](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md)
  scenario "Assign an article's URN and publish it" that opens a press's
  publish window with only "Monographs" ticked and expects the one
  line. The URN plugin has no `tests/` folder for a unit test.

Small: one operand in one line.

## Evidence

- Kept scripts, in
  [press-publish-urn-table-instead-of-sentence/](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-publish-urn-table-instead-of-sentence/):
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-publish-urn-table-instead-of-sentence/walk.js)
    takes the Steps on a fresh load of the default dataset and reads the
    URN part of the window: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/press-publish-urn-table-instead-of-sentence/walk.js`
    (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-publish-urn-table-instead-of-sentence/neighbour.js)
    opens the same window, on a fresh load, with "Monographs" and
    "Publication Formats", "Monographs" and "Chapters", and
    "Publication Formats" alone; walked with the fix in and out.
  - The fix was tried with `node bin/try-fix.js apply
    shared/playwright/checks/issues/press-publish-urn-table-instead-of-sentence/fix.diff omp`,
    then both scripts, each on a fresh load, then
    `node bin/try-fix.js revert omp`.
- Walked through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30): OMP `main` and `stable-3_5_0`, every
  step.
- Code reads: OMP's `URNPubIdPlugin` on `stable-3_4_0` (`.php`, line
  387) and `stable-3_3_0` (`.inc.php`, line 415). The first releases
  carrying the change are 3.4.0-0 and 3.3.0-15 (`git tag --contains`).
- Tips: `main` OMP 3b0ecf794 (lib/pkp 3dc90c81a6); `stable-3_5_0` OMP
  3081c9b00 (lib/pkp a9c76aed62); `stable-3_4_0` OMP 0aec65441;
  `stable-3_3_0` OMP 8e72fc883.
- Introduced: `git blame` on line 384 lands on 87e5cd62 itself, merged
  in 6ab05f7e ("Merge pull request #1396 from bozana/8940"); a6305abd
  was merged in 2fceca05 ("Merge pull request #1398 from bozana/6293").
- Upstream: pkp/pkp-lib searched for "URN publish monograph", "URN
  table publish", "URN OMP preview", "URN confirmation publication",
  `addPublishFormNotice` and `publicationFormatUrnEnabled`; pkp/omp for
  "URN", "URN publish" and `addPublishFormNotice`; pkp/ui-library for
  "URN". `pkp/pkp-lib#10443` (the table's styling) and
  `pkp/pkp-lib#8940` (the change above) are about other points.
- Not driven: OJS (its one line is the spec's note
  [q16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#fn-q16));
  confirming "Publish". That a missing URN does not block publishing is
  read in the code: the plugin adds no publish requirement, and its
  `Publication::validate` check passes an empty URN.
