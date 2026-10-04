# Chapter window promises an automatic license above a chapter's own License URL and on a published book

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code; above a chapter's own License URL only, since a published version's chapters cannot be opened there)
  - 3.3: none (code; no chapter licenses)
- **Introduced** `pkp/omp#1166` for `pkp/pkp-lib#5338` · [8a5e685aca](https://github.com/pkp/omp/commit/8a5e685acad165979960a31c1667d6bbd20695c8) · 2022-08-08 · Christian Marsilius (nongenti)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U72 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U72-chapters-work-type.md#a8)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

On an Edited Volume, the chapter window says "The license will be set
automatically to {license} when this is published." above the chapter's
"License URL" box. The sentence shows even when the box already holds the
chapter's own license URL, which publishing keeps. It also shows on a
published version, where publishing has already filled every empty box.

An editor who reads it may believe that the chapter's own license will be
replaced, or that something is still to happen on a book that is already
out.

It shows on every Edited Volume of a press that has a license set in any
of three places: the press's default license, the version's "License
URL", or the version's "Default Chapter License URL".

## Impact

- **Lost**: nothing. Publishing gives each chapter the right license;
  only the sentence is wrong.
- **Who**: press editors and managers on a version's "Chapters" page,
  whenever they open a chapter that has its own license URL, or any
  chapter of a published Edited Volume. On a published version the
  assistant roles (copyeditors, layout editors and the like) can open the
  chapter windows too, and see the same.
- **Way round**: none is needed. The "License URL" box below the sentence
  shows the license that applies.

Low: a help sentence misleads about which license a chapter gets, while
the stored licenses are right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main`.
- The dataset's press has no license, and with none set the sentence
  shows nowhere. Step 1 sets one, as most presses have.

Before publishing:

1. Sign in as `rvaca`. Settings › Distribution › "License": select "CC
   Attribution 4.0", press "Save".
2. Sign in as `dbarnes`. Open submission 4, "How Canadians Communicate:
   Contexts of Canadian Popular Culture" (in Production).
3. In the workflow's header, the work-type button reads "Monograph":
   choose "Edited Volume".
4. "Publication" › "Chapters": press "Introduction: Contexts of Popular
   Culture" and read "License URL"; press "Cancel".
5. Press "Chapter 1. A Future for Media Studies: Cultural Labour,
   Cultural Relations, Cultural Politics", type
   `https://example.org/u72d-chapter-license` in "License URL", press
   "Save".
6. Press "Chapter 1. …" again and read "License URL"; press "Cancel".

After publishing:

7. In the publication's header press "Publish", then "Publish" in the
   window that asks.
8. "Publication" › "Chapters": press "Introduction: …" and read
   "License URL"; press "Cancel".
9. Press "Chapter 1. …" and read "License URL"; press "Cancel".

**Expected**: at step 4 the sentence above the empty box, which is right:
publishing gives this chapter CC Attribution 4.0. At step 6 the box holds
`https://example.org/u72d-chapter-license` and no sentence promises
another license. At steps 8 and 9 the boxes hold
`https://creativecommons.org/licenses/by/4.0` (filled by publishing) and
`https://example.org/u72d-chapter-license` (kept), with no sentence about
what will happen "when this is published".

**Observed**: the same sentence at steps 4, 6, 8 and 9, its license name
a link to `https://creativecommons.org/licenses/by/4.0`:

```
License URL
The license will be set automatically to CC Attribution 4.0 when this is published.
[ https://example.org/u72d-chapter-license ]      (step 6, and step 9 after publishing)
[ https://creativecommons.org/licenses/by/4.0 ]   (step 8, after publishing)
```

## Cause

`ChapterForm::initData()` (OMP
`controllers/grid/users/chapter/form/ChapterForm.php`, lines 138–182)
builds `chapterLicenseUrlDescription` for every chapter of an Edited
Volume. The license it names is the version's `chapterLicenseUrl`, else
its `licenseUrl`, else the press's `licenseUrl`. The method never looks
at the chapter's own `licenseUrl` (which it reads into the box at line
199) or at the version's `status`.
`templates/controllers/grid/users/chapter/form/chapterForm.tpl` (line 53)
prints the result above the box.

The sentence describes `Repository::addChapterLicense()` (OMP
`classes/publication/Repository.php`, line 570), which `publish()`
hooks onto `Publication::publish::before`. It acts only when the version
becomes published, and it fills only chapters whose `licenseUrl` is
empty. So the sentence is true only above an empty box on a version that
is not published, and `initData()` shows it everywhere.

Reach:

- The "published book" half shows wherever a published version's
  chapter window opens. On `main` and 3.5, `ChapterGridHandler` lets
  managers, series editors and the assistant roles edit a published
  version's chapters (`pkp/pkp-lib#10263`). On 3.4, a published version's
  chapter list is read-only and its titles open nothing, so only the
  own-License-URL half shows there (checked in the code).
- A chapter added to a published version keeps an empty box under the
  sentence, and no publish runs again to fill it. Whether such a chapter
  should take the default is a separate product question (tracked as
  [U72 A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U72-chapters-work-type.md#a9)).
  The fix below removes the sentence there too and leaves that question
  alone.
- The same sentence is built in two more places:
  `PKPPublicationLicenseForm` ("License URL" on "Permissions &
  Disclosure") and OMP's `PublicationLicenseForm` ("Default Chapter
  License URL"). Both fields stay locked behind "Override" while they are
  empty, so there the sentence sits beside a locked field. Once the field
  holds a value (an editor's override, or on a preprint server the
  license the author chose when submitting), the sentence stays beside
  it. Whether it should is a product question (tracked as [U40
  A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U40-publication-metadata.md#a20)
  and
  [OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U40-publication-metadata.md#ops2)).
  The chapter's box is different: it has no lock and shows the chapter's
  own license URL openly. On a published book its sentence is wrong
  however that question is settled. This report covers only the chapter
  window.

## Proposed fix

Build the sentence in `ChapterForm::initData()` only under the conditions
`addChapterLicense()` itself checks: the version is not published, and
the chapter has no license URL of its own. "Add Chapter" has no chapter
yet, so it keeps the sentence on an unpublished version. The whole diff
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/chapter-license-sentence-own-address-published/fix.diff)):

```diff
--- a/controllers/grid/users/chapter/form/ChapterForm.php
+++ b/controllers/grid/users/chapter/form/ChapterForm.php
@@ -135,9 +135,16 @@
      */
     public function initData()
     {
-        //Create chapter license URL description
+        // Describe the license publishing will give the chapter: only on an
+        // edited volume's unpublished version, and only while the chapter has
+        // no license of its own (Repository::addChapterLicense() fills empty ones).
         $chapterLicenseUrlDescription = '';
-        if ($this->getMonograph()->getData('workType') === Submission::WORK_TYPE_EDITED_VOLUME) {
+        $chapter = $this->getChapter();
+        if (
+            $this->getMonograph()->getData('workType') === Submission::WORK_TYPE_EDITED_VOLUME
+            && $this->getPublication()->getData('status') !== Publication::STATUS_PUBLISHED
+            && !$chapter?->getLicenseUrl()
+        ) {
             $licenseOptions = Application::getCCLicenseOptions();
             $context = Application::get()->getRequest()->getContext();
             if ($this->getPublication()->getData('chapterLicenseUrl')) {
@@ -187,7 +194,6 @@
         $this->setData('submissionWorkType', $this->getMonograph()->getData('workType'));
         $this->setData('chapterLicenseUrlDescription', $chapterLicenseUrlDescription);
 
-        $chapter = $this->getChapter();
         if ($chapter) {
             $this->setData('chapterId', $chapter->getId());
             $this->setData('title', $chapter->getTitle());
```

A scheduled version keeps the sentence, which stays true: the
scheduled-publication task publishes it through the same `publish()`,
which fills the empty boxes then. The status test is the one
`ChapterGridHandler` makes for a published version. The handler names
the value `PKPSubmission::STATUS_PUBLISHED` and the diff
`Publication::STATUS_PUBLISHED`, which `ChapterForm` already imports;
both are 3.

The fix was tried on OMP `main`. With it, steps 6, 8 and 9 show the box
without a sentence, and step 4 keeps the sentence. A neighbour check gave
the same result with the fix in and out. On submission 2, an unpublished
Edited Volume, the chapter "Critical History in Western Canada 1900–2000"
kept the sentence above its empty box. Submission 4, left a Monograph,
still had no "License URL" in its chapter window.

**Alternatives**:

- Reword the sentence as a condition ("Left empty, this chapter will
  receive … when the book is published."). That is still wrong on a
  published book, and it needs a new string in every language.
- Change all three sentences together once the version-level question
  above is settled. The chapter window's sentence is wrong on a
  published book whichever way that goes, so its fix need not wait.
- Hide the sentence in the browser as the box is typed into. The legacy
  form has no such binding, and the server-side condition covers what the
  window shows when it opens.

**What goes with it**:

- Nothing is stored, so no data repair is needed. No API, hook or other
  screen reads the sentence.
- The fix applies as written to `stable-3_5_0` and `stable-3_4_0`
  (`initData()` and its imports are the same; `?->` needs PHP 8.0, which
  3.4 requires).
- The guard: a Planned e2e scenario in spec U72 that opens a chapter with
  its own license URL, and a chapter of a published version, and finds no
  sentence. `ChapterForm` has no unit test.

Small: one condition in one method, already tried.

## Evidence

- Kept script, run on the default dataset after loading it (OMP alone has
  chapters):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/chapter-license-sentence-own-address-published/walk.js),
  with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/chapter-license-sentence-own-address-published/lib.js).
  With no argument it takes the Steps. `neighbour` takes step 1, then
  reads two chapter windows: "Critical History in Western Canada
  1900–2000" on submission 2 (an unpublished Edited Volume, its box
  empty), and "Introduction: …" on submission 4 without step 3 (still a
  Monograph). Each read records the box, the sentence and the stored
  `licenseUrl`. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/chapter-license-sentence-own-address-published/walk.js [neighbour]`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walks: OMP `main` (the Steps without and with the fix; `neighbour` with
  the fix in and out) and 3.5 (the Steps). Both ran on PostgreSQL with
  the default dataset at pkp/datasets 566bb1f (2026-10-03). The Steps
  were the same on 3.5; its publish window lacks `main`'s version-stage
  line. No server or script error was logged. The fix was not tried on
  3.5. The fault does not depend on the database.
- Stored values after step 7 (`main` and 3.5): the version's
  `licenseUrl` and `chapterLicenseUrl` both
  `https://creativecommons.org/licenses/by/4.0`; the Introduction's
  `licenseUrl` the same; Chapter 1's still
  `https://example.org/u72d-chapter-license`.
- Branch tips: OMP `main` 3b0ecf794c, its pkp-lib 3dc90c81a6,
  ui-library 280f98c5; OMP `stable-3_5_0` 9c5e24246c, pkp-lib
  cf3f984335; OMP `stable-3_4_0` 0aec65441f, pkp-lib 767353f4fe; OMP
  `stable-3_3_0` 8e72fc8836, pkp-lib ac3fa73402.
- Code reads: 3.5's `ChapterForm::initData()` is the same as `main`'s.
  3.4 (`git show upstream/stable-3_4_0:`): the same `initData()` and
  `chapterForm.tpl`. There, `ChapterGridHandler::initialize()` sets a
  published version's list read-only, `ChapterGridCategoryRowCellProvider`
  then gives the title no "editChapter" link, and `canAdminister()`
  refuses a published version. 3.3: `ChapterForm.inc.php` and
  `chapterForm.tpl` have no license, and `PublicationService.inc.php`
  no chapter license.
- Introduced: `git blame` on `initData()`'s lines 138–182 gives
  8a5e685aca (`pkp/omp#1166`, merged 2022-09-05), which added chapter
  licenses with the sentence in this form. The "after publishing" half
  became reachable when a published version's chapters opened for
  editing: `pkp/omp#2006` on `main` and `pkp/omp#1943` on
  `stable-3_5_0` (both for `pkp/pkp-lib#10263`, 2025).
- Upstream search (2026-10-04), issues and pull requests: pkp/pkp-lib
  and pkp/omp by "chapter license", "edited volume license", "license
  will be set automatically", `chapterLicenseUrl` and more; pkp/omp by
  `ChapterForm` license; pkp/ui-library by "license description".
  Nothing matches this fault. `pkp/pkp-lib#11224` (closed) is about which fields
  the chapter window shows on 3.3–3.5. `pkp/pkp-lib#5428` (closed) set the
  publication fields' "Override" lock and the publish-time fill the
  sentence describes.
