# A book's new version leaves its chapters' files behind, and a proof made from one is linked nowhere

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#700` for `pkp/pkp-lib#2072` · [ce205d5836](https://github.com/pkp/omp/commit/ce205d58362e3bdcfaf1dc59e43c6c068e12415c) · 2019-08-21 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U72 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U72-chapters-work-type.md#a3)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

After "Create New Version" on a book, a chapter's window in the new
version lists, of the chapter's own files, only the proof copied with
the book's publication format. Its manuscript and its other working
files are neither ticked nor offered, because each file stays assigned
to the earlier version's chapter, and a file can be assigned to one
chapter only.

An editor who then adds a proof to the new version with "Select Files",
choosing one of those chapter files, publishes a file that the book's
page links nowhere: not under its chapter and not among the book's
downloads. Nothing says so.

The way round is to add the file with the format's "Change File", which
uploads it beside the format's other files, and then tick it in the
chapter's window. A book already published this way can be repaired on
screen: untick the proof in the earlier version's chapter window, then
tick it in the new version's.

## Impact

- **Lost**: the chapter's working files in the new version's chapter
  windows; and, for readers, a published proof, which no page links and
  only its address still opens.
- **Who**: press editors adding a new version's proofs the usual way,
  with "Select Files" (pkp's own test data adds this book's proofs so),
  on a book whose chapters have files assigned; then every reader of
  the book.
- **Way round**: the format's "Change File", then the file ticked in the
  chapter's window. The repair works, but the earlier version's window
  lists four boxes all named "chapter2.pdf", ticked, and nothing tells
  the new proof apart. The working files themselves cannot be assigned
  to the new chapter without first being unticked in the published
  earlier version.

Medium: a published chapter file drops off the book's page without a
word, but only for a proof made from a chapter's file after a new
version, and the editor can avoid it or repair it on screen. It would be
high if most presses' chapter books get second versions.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OMP (`publicknowledge`).
- Submission 14, "From Bricks to Brains: The Embodied Cognitive Science
  of LEGO Robots", published, with one version; `dbarnes` is its
  editor. Each of its four chapters has three files named after it
  assigned (for "Chapter 1: Mind Control—Internal or External?" three
  files "chapter1.pdf"): the Book Manuscript among the submission
  files, its copy among the internal review files, and the proof in the
  "PDF" publication format.

The chapter's files:

1. Sign in as `dbarnes` and open submission 14.
2. "Publication" › the published version › "Chapters"; press "Chapter 1:
   Mind Control—Internal or External?" and read "Files"; "Cancel".
3. "Create New Version", "Revision Significance" "Minor Revision",
   "Confirm". (3.5: the publication page's "Create New Version",
   answered "Yes".)
4. The new version's "Chapters"; press "Chapter 1: Mind Control—Internal
   or External?" and read "Files"; "Cancel".
5. The earlier version's "Chapters" (3.5: chosen in the publication
   page's version menu); press "Chapter 1: …" and read "Files"; "Cancel".

**Expected** (step 4): "Files" holds the chapter's three "chapter1.pdf",
ticked, as in step 2, or at least offers them.

**Observed**: step 2 lists three "chapter1.pdf", ticked. Step 4 lists one
"chapter1.pdf", ticked (the new version's copy of the proof); the Book
Manuscript and the internal review copy are not listed. Step 5 still
lists all three, ticked. Files assigned to no chapter ("Segmentation of
Vascular Ultrasound Imag.pdf", "The Canadian Nutrient File: Nutrient
Val.pdf") are offered, unticked, in both versions.

A proof made from a chapter's file (same new version):

6. The new version's "Publication Formats": "PDF" › "Select Files". The
   list opens on the production stage, empty ("No Items"); tick "Show
   files from all accessible workflow stages.", then under "Submission"
   tick "chapter2.pdf" (Book Manuscript) and press "OK".
7. On the new "chapter2.pdf" row: "Awaiting Approval" › "OK"; "Set
   Terms" › "Open Access" › "Save". The row reads "Approved", "Open
   Access".
8. The new version's "Chapters"; press "Chapter 2: Classical Music and
   the Classical Mind" and read "Files"; "Cancel".
9. Publish the new version: "Publish", then "Publish" in the
   confirmation. (3.5: "Schedule For Publication", then "Publish".)
10. Sign out and open the book's page,
    `/index.php/publicknowledge/catalog/book/14`.

**Expected**: in step 8 the new proof is listed; in step 10 "Chapter 2:
Classical Music and the Classical Mind" offers the new proof beside the
earlier one.

**Observed**: step 8 lists one "chapter2.pdf", ticked (the copied proof);
the new proof is not listed. On the book's page each of the four
chapters offers one link, "PDF", to its copied proof, and the book's
downloads are "The Canadian Nutrient File: Nutrient Val.pdf" and
"Segmentation of Vascular Ultrasound Imag.pdf". The new "chapter2.pdf"
is linked nowhere on the page.

The repair, on the book as step 10 left it:

11. Sign in as `dbarnes`; the earlier version's "Chapters"; press
    "Chapter 2: …". "Files" lists four "chapter2.pdf", all ticked; the
    first is the new proof. Untick it and press "Save".
12. The new version's "Chapters"; press "Chapter 2: …". "Files" now
    offers a second "chapter2.pdf", unticked; tick it and press "Save".
13. Sign out and open the book's page again.

**Observed**: "Chapter 2" offers two links, "chapter2.pdf" and
"chapter2.pdf" (the new proof and the copied one). A chapter with more
than one file in the same format names each link by its file name
instead of the format's name. The earlier version's page, at
`/index.php/publicknowledge/catalog/book/14/version/14`, is unchanged.

The way round (instead of steps 6–8):

6. The new version's "Publication Formats": "PDF" › "Change File". The
   window "Upload a File Ready for Publication" opens; choose "Book
   Manuscript", upload the corrected chapter file (here
   "replacement.pdf"), "Continue", "Continue", "Complete". The format
   now lists "replacement.pdf" above "chapter2.pdf"; nothing is
   replaced.
7. "Awaiting Approval" › "OK"; "Set Terms" › "Open Access" › "Save".
8. The new version's "Chapters"; press "Chapter 2: …"; "Files" offers
   "replacement.pdf", unticked; tick it and press "Save".

**Observed** after steps 9 and 10: "Chapter 2" offers "replacement.pdf"
and "chapter2.pdf".

With the proposed fix, step 4 lists all three "chapter1.pdf", ticked,
and in step 10 "Chapter 2" offers the new and the copied "chapter2.pdf".

## Cause

A submission file is assigned to a chapter by one `chapterId` setting,
and that names one version's row in `submission_chapters`. The copies
of a chapter across versions share its `source_chapter_id`. Manuscripts
and review, copyedited and production-ready files belong to the
submission; only a publication format's proofs belong to one version.

`APP\publication\Repository::version()` (omp
`classes/publication/Repository.php`, lines 214–233) clones each chapter
into the new version and moves `chapterId` to the clone only on
`$newSubmissionFiles`, the proof copies it has just made for the new
formats. Every other file stays assigned to the earlier version's
chapter.

Two readers then go wrong:

- `ChapterForm::fetch()` (omp
  `controllers/grid/users/chapter/form/ChapterForm.php`, lines 255–271)
  offers a file only when it has no chapter or this one ("Include in
  list if not used in another chapter"), so the new version's chapter
  window neither ticks nor offers the files left behind.
- "Select Files" (`ManageProofFilesForm::importFile()`, lib/pkp
  `controllers/grid/files/proof/form/ManageProofFilesForm.php`, line 77)
  clones the chosen file into the format, `chapterId` included, so the
  new proof is assigned to the earlier version's chapter. The book's page
  (`templates/frontend/objects/monograph_full.tpl`, lines 202 and 317)
  lists a format file under the shown version's chapter it is assigned
  to, or among the book's downloads when it has none; this proof matches
  neither.

Reach:

- The chapter window and the book's page: walked.
- A chapter's own page lists its files by the same chapter id
  (`templates/frontend/objects/chapter.tpl`, line 151), and Google
  Scholar's `citation_pdf_url` on a chapter page matches
  `$chapter->getId()` to the file's `chapterId`
  (`plugins/generic/googleScholar/GoogleScholarPlugin.php`, lines
  157–168): the proof is left out there too (code).
- The native XML export writes a chapter's `submission_file_ref` from
  the files assigned to it (`ChapterNativeXmlFilter`, lines 108–118):
  the new version's chapters export no working files (code).
- Stored data: every book that already has a second version holds its
  working files on an earlier version's chapters, and any proof made in
  a later version from those files is assigned to another version's
  chapter.

## Proposed fix

In `version()`, treat a file assigned to any version's copy of a chapter
(the chapters with the same source chapter) as that chapter's file:
move the working files to the new chapter, and assign the proof copies
by the same rule
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-chapter-files-left-behind/fix.diff)):

```diff
+        // Files linked to a chapter that belong to the submission rather than to a publication
+        // format (manuscripts, review, copyedited and production-ready files)
+        $chapterWorkingFiles = Repo::submissionFile()
+            ->getCollector()
+            ->filterBySubmissionIds([$submissionId])
+            ->getMany()
+            ->filter(fn (SubmissionFile $file) => $file->getData('chapterId')
+                && $file->getData('assocType') != Application::ASSOC_TYPE_REPRESENTATION)
+            ->collect();
 …
+            // Every version's copy of this chapter (the chapters sharing its source chapter): a file
+            // naming any of them belongs to this chapter
+            $sameChapterIds = [];
+            $chapterCopies = $chapterDao->getBySourceChapterId($oldChapter->getSourceChapterId());
+            while ($chapterCopy = $chapterCopies->next()) {
+                $sameChapterIds[] = (int) $chapterCopy->getId();
+            }
 
             // Update file chapter associations for new files
             foreach ($newSubmissionFiles as $newSubmissionFile) {
-                if ($newSubmissionFile->getChapterId() == $oldChapter->getId()) {
+                if (in_array((int) $newSubmissionFile->getChapterId(), $sameChapterIds)) {
 …
+            // A file names one chapter only: the chapter's working files move to the new version's
+            // copy, the version created last. Each version's proofs stay with its own chapters.
+            foreach ($chapterWorkingFiles as $chapterWorkingFile) {
+                if (in_array((int) $chapterWorkingFile->getData('chapterId'), $sameChapterIds)) {
+                    Repo::submissionFile()->edit($chapterWorkingFile, ['chapterId' => $newChapter->getId()], false);
+                }
+            }
```

The working files then belong to the version created last, whichever
version it was made from: on `main` the "Create New Version" window's
"Version Source" can name an older one. `getSourceChapterId()` falls
back to the chapter's own id when `source_chapter_id` is empty, and
`ChapterDAO::getBySourceChapterId()` matches either, so a book's first
chapters are covered. The same rule repairs a book already in the broken
state the next time a version is made from it. The `false` keeps the
move out of the Activity Log, since nobody edited those files. The
pattern is the method's own: it already moves the copied proofs with
`Repo::submissionFile()->edit()`.

Tried on `main`: the walk then shows the Expected of the first two
groups; the new "Chapter 2" window lists four "chapter2.pdf", ticked,
the new proof among them. A version made from "Version of Record 1.0" while 1.1 was
published got all three "chapter1.pdf" in its "Chapter 1" window (one
without the fix). As the neighbour check, the earlier version's book
page was read after "Create New Version", with the fix in and out: the
same both times, each chapter with one "PDF" link to its own proof. With
the fix the earlier version's "Chapter 1" window lists only its proof.

**Alternatives**:

- Match files by `source_chapter_id` in `ChapterForm` alone: the window
  would show the files, but the book's page would still leave out later
  proofs, and `updateChapterFiles()` would have to update an existing
  setting rather than insert one.
- Copy the working files into each version: one manuscript would become
  several, and editors would see duplicates in every file list.
- Assign files to the chapter's `source_chapter_id` instead of one
  version's chapter: the sounder model, but a schema change and a change
  to the REST API's `chapterId`; large.

**What goes with it**:

- An upgrade migration for books that already have versions. A chapter's
  key is `COALESCE(source_chapter_id, chapter_id)`; a submission's
  newest version is its publication with the highest
  `publication_id`, the one created last, where `version()` now puts
  the files.
  - A working file (not attached to a publication format) whose chapter
    has a key that the newest version also has moves to that chapter;
    when the newest version has no chapter with that key (the chapter
    was deleted there), it stays where it is.
  - A proof whose chapter belongs to another version than its format's
    moves to the chapter with the same key in its format's version. When
    that version has no such chapter, its `chapterId` is cleared, so the
    proof shows among the book's downloads and the chapter windows offer
    it, instead of staying hidden.
- Left out: after the fix, a proof added to an older version's format
  with "Select Files" from a working file would be assigned to the
  newest version's chapter, so that older version's book page would
  leave it out: the mirror image of today's fault. Fixing it needs
  `importFile()` to pick, by source chapter, the chapter of the format's
  own version.
- Left out: deleting an unpublished version, which only the REST API
  does (no screen offers it), would now clear these files' chapter
  (`ChapterDAO::deleteById()`), where today they stay on the earlier
  chapter. `Repository::delete()` could hand them to the same-source
  chapter of the newest remaining version.
- Backport: 3.5's and 3.4's `Repo::submissionFile()->edit()` has no
  `$log` argument, so each moved file adds a "file edited" line there.
  3.3 does the same job in `PublicationService::version()` with
  `Services::get('submissionFile')->edit()`.
- Guard: a unit test of `version()` that checks a working file's
  chapter, made from the newest and from an older version, and the U72
  scenario 10 "Tides copied" reading the copied chapter's "Files".

Medium: the code change is a few lines in one method and was tried, but
books that already have versions need the upgrade migration.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-chapter-files-left-behind/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-chapter-files-left-behind/lib.js),
  run on an install freshly loaded from the dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/new-version-chapter-files-left-behind/walk.js [neighbour|repair|wayround|older-source]`.
  Without a mode it takes steps 1–10; `repair` adds steps 11–13,
  `wayround` takes the way round, `older-source` makes a version from
  "Version of Record 1.0", and `neighbour` reads the earlier version
  after "Create New Version". It records each window's boxes with the
  file number in each box's value, the book page's links, and each
  file's stored chapter.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/new-version-chapter-files-left-behind/fix.diff omp`,
  the walk, `neighbour` and `older-source` on a freshly loaded install
  each, `node bin/try-fix.js revert … omp`, then `neighbour` and
  `older-source` without the fix.
- Walked on OMP `main` 3b0ecf794c (lib/pkp 3dc90c81a6) and
  `stable-3_5_0` 9c5e24246c (lib/pkp cf3f984335), each on its dataset
  from pkp/datasets 566bb1f (2026-10-03), PostgreSQL; on 3.5 steps 1–10
  only. On 3.5 steps 3, 5 and 9 differ as the brackets say; the outcome
  was the same. The fault does not depend on the database.
- "Select Files" as the usual path: the format row offers two ways to
  add a file, "Change File" (an upload) and "Select Files" (a file
  already on the submission). pkp's data test that builds this book
  (`cypress/tests/data/60-content/MdawsonSubmission.cy.js`, lines
  184–196) adds its proofs with "Select Files", ticking "Show files from
  all accessible workflow stages." and each chapter's file, as steps 6–7
  do. A file assigned to a chapter at any stage behaves the same, since
  "Select Files" copies its chapter.
- Stored data on `main` after step 10: the new proof (file 151) is
  assigned to chapter 55, the first version's "Chapter 2"; the new
  version's "Chapter 2" is chapter 73. Opened by its address
  (`/catalog/view/14/4/151`), the proof's own page answers 200; the
  download behind it answers 500, as every press file download does
  today ([U69 A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U69-A9-book-file-open-download-fails.md)),
  a separate fault.
- 3.4 (code), `upstream/stable-3_4_0` 0aec65441f (lib/pkp
  767353f4fe): `classes/publication/Repository.php` `version()` lines
  218–226 move only the format copies; `ChapterForm.php` lines 260–272
  carry the same filter; `monograph_full.tpl` lines 191 and 306 the same
  lists.
- 3.3 (code), `upstream/stable-3_3_0` 8e72fc8836 (lib/pkp ac3fa73402):
  `classes/services/PublicationService.inc.php` `version()` lines
  327–332 move only the format copies; `ChapterForm.inc.php` lines
  167–176 offer a file only with no chapter or this one;
  `monograph_full.tpl` lines 244 and 343 the same lists; lib/pkp
  `ManageProofFilesForm.inc.php` lines 60–66 clone the chosen file.
- Introduced: blame on `Repository.php` lines 224–231 reaches the
  PSR-12 reformat 01088072a8 and the move to repositories (44b458eea6,
  01377b8212, c679eb284c), none of which changed what is moved;
  `git log -S'Update file chapter associations'` reaches ce205d5836, the
  versioning commit that wrote the loop for the format copies alone (PR
  `pkp/omp#700`).
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched for
  "chapter files new version", "chapter version files missing", "new
  version chapter", "chapterId version", "versioning chapter files",
  "proof file chapter not shown" and the method names. The nearest are
  `pkp/pkp-lib#13036` (chapter authors on a new version, fixed; the
  same method, another fault) and `pkp/pkp-lib#6894` (choosing files in
  the chapter window).
- Not walked: chapter pages, the Google Scholar tags and the native
  export, each read in the code; the upgrade migration is a proposal,
  not tried.
