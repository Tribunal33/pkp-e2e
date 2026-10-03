# A press editor withdrawing a book's format reads "This format will unavailable to readers."

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#146` for `pkp/pkp-lib#825` · [461a0e1d58](https://github.com/pkp/omp/commit/461a0e1d5897d48d05752673fa55c98d2e8a6b3a) · 2015-10-21 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U73 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a11)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

When a press editor presses "Available" on a book's format to withdraw
it, the "Format Availability" window reads "This format will
unavailable to readers. Any downloadable files or other distributions
will no longer appear in the book's catalog entry.": the word "be" is
missing.

## Impact

- **Lost.** Nothing: wording only.
- **Who.** Press managers and editors, each time they withdraw a format
  on a book's "Publication Formats" page.
- **Way round.** None needed; the sentence is understood as it is.

Low: a missing word in a confirmation window, and the task gets done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, press `publicknowledge`.
  Nothing else: book 14, "From Bricks to Brains: The Embodied Cognitive
  Science of LEGO Robots", is published, its "PDF" format is
  "Available", and `dbarnes` is assigned to it.

Steps:

1. Sign in as `dbarnes` (the Press editor).
2. Open book 14's workflow:
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=14`
   (by address: the dashboard's first view does not list a published
   book).
3. In the side menu choose "Publication" › "Publication Formats".
4. In the "PDF" row press "Available".
5. Read the "Format Availability" window, then press "Cancel".

**Expected.** "This format will be unavailable to readers. Any
downloadable files or other distributions will no longer appear in the
book's catalog entry."

**Observed.**

```
Format Availability
This format will unavailable to readers. Any downloadable files or other distributions will no longer appear in the book's catalog entry.
[OK] [Cancel]
```

"Cancel" closes the window and "PDF" still reads "Available".

## Cause

The window's text is OMP's
`grid.catalogEntry.availableRepresentation.removeMessage` in
`locale/en/locale.po` (line 241), which
`PublicationFormatGridCellProvider::getCellActions()` passes to the
"Availability" cell's `RemoteActionConfirmationModal` when the format
is available:

```
msgstr "<p>This format will <em>unavailable to readers</em>. Any downloadable files or other distributions will no longer appear in the book's catalog entry.</p>"
```

The sentence was written this way in 461a0e1d58, which rewrote both
availability messages to be shorter ("This format will <em>no longer be
made available</em> to readers, …" before it) and dropped the "be".

Reach:

- Only this window, on OMP: OJS and OPS have no publication formats and
  no such key (read in the code).
- English only: no other language translates this key (31 of OMP's
  other locale files leave it empty, the other two lack it), so no
  translation needs a change.

## Proposed fix

Add the missing word, keeping the emphasis on the same words as the
"available" message
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/format-unavailable-window-missing-word/fix.diff)):

```diff
 msgid "grid.catalogEntry.availableRepresentation.removeMessage"
-msgstr "<p>This format will <em>unavailable to readers</em>. Any downloadable files or other distributions will no longer appear in the book's catalog entry.</p>"
+msgstr "<p>This format will be <em>unavailable to readers</em>. Any downloadable files or other distributions will no longer appear in the book's catalog entry.</p>"
```

Tried on OMP `main`: with the diff applied, the window of book 14's
"PDF" reads "This format will be unavailable to readers. …".

**Alternatives**

- None.

**What goes with it**

- No test: a guard for one sentence's wording costs more than it saves.
- Backport: the same line is on `stable-3_5_0` and `stable-3_4_0`
  (`locale/en/locale.po`) and `stable-3_3_0`
  (`locale/en_US/locale.po`); the diff applies to 3.5 and 3.4 as
  written, and to 3.3 with the file name changed.

Small: one word in one English locale file.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/format-unavailable-window-missing-word/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/format-unavailable-window-missing-word/walk.js)
  takes steps 1 to 5 (it reuses the helpers of
  `format-controls-offered-then-refused/lib.js`):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/format-unavailable-window-missing-word/walk.js`
- Walked on OMP `main` and `stable-3_5_0`, on PostgreSQL, from
  pkp/datasets 566bb1f (2026-10-03).
- Neighbour check of the fix (`WALK_MODE=neighbour`, the same command):
  book 4's "PDF" ("Not Available") opens "Make this format available to
  readers. …" with the diff in and out.
- Tips: `main` OMP 3b0ecf794c (`lib/pkp` 3dc90c81a6); `stable-3_5_0` OMP
  9c5e24246c; `stable-3_4_0` OMP 0aec65441; `stable-3_3_0` OMP
  8e72fc883.
- Introduced: `git log -S` on the sentence leads to 461a0e1d58. The
  header names the PR's author, Alec Smecher, whose `pkp/omp#146`
  (merged 2015-10-27) carried it; the commit itself is Nate Wright's
  (NateWr). Since then the key was renamed from
  `availablePublicationFormat` and the file moved from XML to PO
  (21fae1d76c, 2019), with the text unchanged.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched for
  "will unavailable", "unavailable to readers", the key name and
  "Format Availability"; no match.
