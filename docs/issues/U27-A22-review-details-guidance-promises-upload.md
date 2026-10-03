# The Review Details window tells the editor to "upload the file below", but it has no upload control

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ui-library#960` for `pkp/pkp-lib#13156` · [30beb5e3](https://github.com/pkp/ui-library/commit/30beb5e3ed17f98407654d5850e9b682a4005755) · 2026-08-27 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-03)
- **Tracked in** U27 [A22](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a22)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

An editor who opens a reviewer's "Review Details" window (from "Read
Review" or the row's menu) is told under the reviewer's name that, for
a review received elsewhere, they "may upload the file below". The
window has no upload control. Uploading a reviewer's file is offered
only in the "Modify Review" window, which opens from the "Modify Review"
button and which the sentence does not mention.

On 3.5 the older window showed the same sentence with an "Upload File"
link right beneath it. The new window moved the upload into the "Modify
Review" window and kept the sentence, so the fix is a reword pointing
there, not a control to restore.

## Impact

- **Lost**: nothing; the editor's time looking for the control.
- **Who**: every editor who opens a review's details, on every journal
  and press; the sentence shows on every review.
- **Way round**: the "Modify Review" window, opened from the button of
  that name, where "Reviewer Files" has "Upload". A file uploaded there
  is added and logged at once, as any reviewer file.

Low: wording that sends the editor the wrong way, while the task can be
done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`).
  Nothing else.

Steps:

1. Sign in as `dbarnes` (Journal editor).
2. Open submission 7, "Developing efficacy beliefs in the classroom"
   (Review, round 1).
3. In "Reviewers", press "Read Review" on Paul Hudson's row.
4. Read the paragraph under "Paul Hudson", then look through the window
   for a way to upload a file.
5. Press "Modify Review" and answer "Modify Review" in the "Modify this
   review?" dialog.

On OMP the same steps run on submission 16, "A Designer's Log: Case
Studies in Instructional Design", Adela Gallego's row.

**Expected**: the paragraph points to a control the window has: "Modify
Review", where the file can be uploaded.

**Observed**: the paragraph under the reviewer's name reads, in full,

```
Once this review has been read, press "Mark as Complete" to indicate that the review process may proceed. If the reviewer has submitted their review elsewhere, you may upload the file below and then press "Mark as Complete" to proceed.
```

The window's buttons are "Download Review Form", the rating stars,
"Cancel", "Modify Review" and "Mark as Complete". Its "Reviewer Files"
list ("Any supporting files the reviewer chose to upload.") has no
"Upload" and no file box. The "Modify Review" window that step 5 opens
has "Upload" in its "Reviewer Files". On OMP the two windows read and
offer the same.

On 3.5 the same steps open the older "Review" window, where an "Upload
File" link sits under the sentence (which there ends "…press "Confirm"
to proceed.").

## Cause

The Review Details window takes its guidance from
`editor.review.readConfirmation`: ui-library's `ReviewDetailsInfo.vue`
(`src/managers/ReviewerManager/ReviewDetailsInfo.vue`, line 79) shows it
whenever the window is in display mode. That string was written for the
older "Read Review" window (lib/pkp
`templates/controllers/grid/users/reviewer/readReview.tpl`), which put
the editor's reviewer-file grid, with its "Upload File" link, right
below the sentence.

`pkp/pkp-lib#13156` replaced that window with the new Review Details
window and the "Modify Review" window. `pkp/ui-library#960` built the
display window with a read-only "Reviewer Files" list and moved the
upload into "Modify Review", but kept the old guidance key.
`pkp/pkp-lib#13198`, its pkp-lib half, deleted `readReview.tpl`, changed
"Confirm" to "Mark as Complete" in the English string, kept "upload the
file below", and marked the translations fuzzy for review.

Reach:

- Screens: every Review Details window in display mode, whether opened
  from "Read Review", from the row's "Review Details" or from the
  submissions list's review popover, on a submitted review and on a
  request with no review yet. Walked on OJS and OMP: a submitted review,
  and an unanswered request opened from the row's menu. The "Modify
  Review" window has its own description and is not affected.
- Languages: 53 translations in lib/pkp carry the key, each marked
  fuzzy by `pkp/pkp-lib#13198` and otherwise left as it was. Canadian
  French (`fr_CA`), read on screen, still words the old window's
  sentence, "Confirm" included: "…vous pouvez téléverser le fichier
  ci-dessous puis cliquer sur « Confirmer » pour poursuivre."
- Other apps: a preprint server has no review.

## Proposed fix

Reword the English string so that it points to the control that now
holds the upload, in lib/pkp `locale/en/editor.po`:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-details-guidance-promises-upload/fix.diff),
against the app root:

```diff
--- a/lib/pkp/locale/en/editor.po
+++ b/lib/pkp/locale/en/editor.po
@@ -374,8 +374,8 @@
 msgstr ""
 "Once this review has been read, press \"Mark as Complete\" to indicate that "
 "the review process may proceed. If the reviewer has submitted their review "
-"elsewhere, you may upload the file below and then press \"Mark as Complete\" "
-"to proceed."
+"elsewhere, press \"Modify Review\" to enter it or upload its file, and then "
+"press \"Mark as Complete\" to proceed."
```

"Modify Review" is where an editor now enters a review received
elsewhere, on a submitted review and on a request with no review alike,
and where "Reviewer Files" has "Upload". Tried on OJS and OMP `main`:
the Steps then showed the new sentence in the Review Details window.

On a request with no review, the "Modify this review?" dialog and the
"Modify Review" window still speak of "the review submitted by
{reviewer}" and "a submitted review". That wording is left out of this
fix: whether it should change is an open question,
[U27 A29](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a29).

**Alternatives**

- An "Upload" control in the display window's "Reviewer Files". It
  would make the old sentence true, but undoes the split
  `pkp/pkp-lib#13156` chose (viewing in one window, every change in
  "Modify Review", where it is logged), and is a product decision.
- Dropping the second sentence. It removes the wrong pointer, but also
  the only hint that a review sent by email can be entered at all.

**What goes with it**

- Translations: `pkp/pkp-lib#13198` already marked the key's 53
  translations fuzzy. Once the English text changes, Weblate shows each
  translator the new English next to their old text, and they reword
  both the upload pointer and the old button name ("Confirm").
- Test: an e2e step that opens Review Details on a submitted review and
  checks that each control the guidance names ("Modify Review", "Mark
  as Complete") is a button of that window.

Small: one English string in lib/pkp.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-details-guidance-promises-upload/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-details-guidance-promises-upload/lib.js),
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets e8dafbc, 2026-10-02, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp
  shared/playwright/checks/issues/review-details-guidance-promises-upload/walk.js`
  takes the Steps. Its neighbour mode (`MODE=nb`, "neighbour", not a
  locale) opens the same window with the interface in Canadian French,
  which read the same with and without the fix.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04, ui-library
  64d6736318), OMP 3b0ecf794c (lib/pkp 3dc90c81a6, ui-library
  280f98c570); `stable-3_5_0` OJS c1cee76b95 (lib/pkp 771474347e), OMP
  9c5e24246c (lib/pkp cf3f984335), ui-library d4e0188353; `stable-3_4_0`
  OJS d68934d0d1, OMP 0aec65441f, lib/pkp 767353f4fe; `stable-3_3_0` OJS
  ac77c9fb35, OMP 8e72fc8836, lib/pkp ac3fa73402. The OJS and OMP
  `main` pointers carry the same `editor.po` and `ReviewDetailsInfo.vue`.
- Code reads: `readReview.tpl` on 3.5, 3.4 and 3.3 (the sentence above the
  `EditorReviewAttachmentsGridHandler` grid, whose "Upload File" link is
  on screen on 3.5), and `editor.review.readConfirmation` in the English
  `editor.po` on each line ("Confirm" on 3.5 and older).
- Introduced: `git blame` on `ReviewDetailsInfo.vue` line 79 gives
  30beb5e3 (`pkp/ui-library#960`), the file's first commit; `git log -S
  editor.review.readConfirmation` in lib/pkp gives 4017a024f3
  (`pkp/pkp-lib#13198`, the same author and day).
- Upstream searched in pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library
  by "upload the file below", `readConfirmation` and review details
  upload. `pkp/pkp-lib#13156`'s description lists the upload under
  "Reviewer Files" of the edit window.
