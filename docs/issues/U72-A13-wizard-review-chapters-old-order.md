# Submission wizard: after "Order", the Review step lists a book's chapters in the old order until a reload

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: none (code; no Review step)
- **Introduced** `pkp/omp#1259` and `pkp/ui-library#241` for `pkp/pkp-lib#7191` · [a46e881a3a](https://github.com/pkp/omp/commit/a46e881a3a94b8c663d67af9227d27b73e178347), [467034aa](https://github.com/pkp/ui-library/commit/467034aa4171bca0c46fa9e0e4b8b8dcdaa7cee2) · 2022-10-19 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U72 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U72-chapters-work-type.md#a13)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On the submission wizard's "Details" step, an author reorders the book's
chapters, or the authors of a chapter, with "Order" and "Done", then
opens the "Review" step. The "Chapters" panel there still lists the
chapters, and each chapter's authors, in the order they had when the
page loaded. If the author then adds a chapter, the panel shows it at
the bottom of that old order.

The new order is saved: "Details" shows it and the book is submitted
with it. But the last screen before "Submit" shows the author a table
of contents that is not the one saved, with no hint why, until the page
is reloaded.

## Impact

- **Lost**: nothing; only the Review summary is wrong. The press's
  workflow lists the chapters in the saved order.
- **Who**: whoever submits a monograph or an edited volume through the
  wizard and orders its chapters, or a chapter's authors, there: the
  author, or an editor or press manager making a submission on the same
  page (not walked as an editor). Nobody else sees the panel.
- **Way round**: reload the page in the browser. The wizard reopens on
  its first step, so the author presses "Continue" through the steps
  back to "Review", which then reads the saved order. The reload loses
  nothing already entered: each step's fields are saved when the author
  leaves that step, the Review step has no fields of its own, and
  chapters and contributors are saved with their window's "Save" (read
  in the code; the reload was walked with nothing typed). An
  author who instead trusts the panel may order the list again, or ask
  the press to fix an order that is already right.

Low: the summary misleads, but the submitted book carries the order the
author set. It would be medium if the old order reached the submitted
book.

## Steps to reproduce

Preconditions: PKP's default test dataset for OMP `main`; nothing else.
The dataset press has reviewer suggestions off, so the wizard's steps
are "Upload Files", "Details", "Contributors", "For the Editors" and
"Review" (on 3.5 "Details" comes before "Upload Files").

1. Sign in as `aclark`.
2. Open "New Submission" (`/index.php/publicknowledge/en/submission`).
   Choose "English" under "Submission Language", type the title "Tides
   and Harbours", tick the requirements and privacy boxes, press "Begin
   Submission".
3. Press "Continue" until "Contributors". Press "Add Contributor" and
   add Ben Barrow (Given Name "Ben", Family Name "Barrow", any email
   address, any country, role "Author"), "Save"; then Cy Marsh the same
   way. Press "Continue" until "Review".
4. Open "Details" in the list of steps at the top. Under "Chapters",
   press "Add Chapter": Title "Tides", tick "Ben Barrow" and "Cy Marsh",
   "Save". Add "Harbours" and "Estuaries" the same way, with no
   contributor ticked.
5. Open "Review". The "Chapters" panel reads "Tides" (Ben Barrow, Cy
   Marsh), "Harbours", "Estuaries".
6. Open "Details". Press "Order" above the chapter list, drag "Cy Marsh"
   above "Ben Barrow" under "Tides", press "Done". The list reads Tides:
   Cy Marsh, Ben Barrow.
7. Press "Order" again, drag "Estuaries" above "Tides", press "Done".
   The list reads "Estuaries", "Tides", "Harbours".
8. Open "Review" and read the "Chapters" panel.
9. Open "Details", "Add Chapter" "Deltas", "Save". The list reads
   "Estuaries", "Tides", "Harbours", "Deltas".
10. Open "Review" and read the panel.
11. Reload the page in the browser. The wizard opens on its first step;
    press "Continue" until "Review" and read the panel.

**Expected:** at steps 8 and 10 the panel lists the chapters as
"Details" saved them, as it already does for a chapter added, edited or
deleted:

```
Estuaries
Tides        Cy Marsh, Ben Barrow
Harbours
Deltas       (step 10)
```

**Observed:** at step 8 the panel still reads the order of step 5:

```
Tides        Ben Barrow, Cy Marsh
Harbours
Estuaries
```

At step 10 it reads "Tides" (Ben Barrow, Cy Marsh), "Harbours",
"Estuaries", "Deltas": the new chapter joins at the end of the old
order. Only after the reload (step 11) does it read "Estuaries",
"Tides" (Cy Marsh, Ben Barrow), "Harbours", "Deltas". Each "Done"
answered 200 and no error showed, on the page or in the browser.

## Cause

The Review panel "Chapters" (OMP `templates/submission/review-chapters.tpl`)
draws the page state `chapters`. OMP's `SubmissionHandler::getDetailsStep()`
fills it once, when the page loads, from
`ChapterGridHandler::getChapterData()` for each chapter in stored order.
From then on ui-library's `SubmissionWizardPageOMP.vue` keeps it in step
with the chapter list on "Details" through three global events that
OMP's `ChapterGridHandler` sends: `chapter:added` (pushed at the end),
`chapter:edited` (replaced in place) and `chapter:deleted` (filtered
out).

"Done" posts `chapter-grid/save-sequence`. `ChapterGridHandler` does not
override `saveSequence()`, so it inherits pkp-lib's
`GridHandler::saveSequence()`, which stores the new order (through
`OrderCategoryGridItemsFeature`) and answers only `dataChanged`. That
redraws the grid on "Details", but no event reaches the wizard page, so
`chapters` keeps the order it loaded with.

Reach:

- A new chapter order and a new author order within a chapter both
  stay stale in the panel (checked on screen, steps 6 to 8).
- The workflow's "Chapters" page: the same grid and the same "Done",
  but no Vue copy of the chapters on that page; it redraws from the
  server and shows the new order (checked on screen).
- OPS has the same fault for a preprint's galleys: the wizard's "Upload
  Files" step draws the legacy galley grid, whose "Order" and "Done"
  (`PreprintGalleyGridHandler`, `OrderGridItemsFeature`) answer only
  `dataChanged`, while `SubmissionWizardPageOPS.vue` follows
  `galley:added`, `galley:edited` and `galley:deleted` alone. On OPS
  `main`, after "Order", "Poster" dragged above "PDF" and "Done", the
  Review "Files" panel still read "PDF", "Poster" (checked on screen;
  left out of this report's Affects, which covers the chapters).
- OJS: the wizard has no legacy grid with "Order" (checked in the code).

## Proposed fix

Have the chapter grid announce the new order when it saves one, and
have the wizard page take it. In OMP's `ChapterGridHandler`, override
`saveSequence()` to send the chapters in stored order with a global
event; in ui-library's `SubmissionWizardPageOMP.vue`, replace `chapters`
with them ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-review-chapters-old-order/fix.diff)):

```diff
+    public function saveSequence($args, $request)
+    {
+        $json = parent::saveSequence($args, $request);
+        $publication = $this->getPublication();
+        /** @var ChapterDAO */
+        $chapterDao = DAORegistry::getDAO('ChapterDAO');
+        $chapters = $chapterDao->getByPublicationId($publication->getId())->toArray();
+        $json->setGlobalEvent('chapters:ordered', [
+            'chapters' => array_map(fn (Chapter $chapter) => $this->getChapterData($chapter, $publication), $chapters),
+        ]);
+        return $json;
+    }
```

```diff
+		pkp.eventBus.$on('chapters:ordered', (data) => {
+			this.chapters = data.chapters.map(getChapter);
+		});
```

The event carries what is stored after the save, built by the same
`getChapterData()` the page loads with, so the panel reads exactly what
a reload would show, the authors' order included. Tried on OMP `main`:
the steps then showed the Expected at steps 8 and 10. To check that the
fix changes nothing where no wizard listens, "Order" and "Done" on the
workflow's "Chapters" page of submission 12 kept the new order at once
and after a reload, with the fix in and out, and no page error either
way.

**Alternatives:**

- Reload the publication on entering "Review" and read the chapters
  from it: one request per visit, and the wizard page would then hold
  two copies of the chapters to keep in step.
- Send `chapter:edited` for each chapter: it replaces a chapter in
  place, so the order would still not change.

**What goes with it:**

- OPS's galleys (the Cause's last reach bullet) need the same change:
  `PreprintGalleyGridHandler::saveSequence()` sending the galleys as
  `getGalleyData()` maps them, and `SubmissionWizardPageOPS.vue` taking
  them. It is a separate fix in another app, not tried here and not
  counted in this effort; it can share the ui-library PR, but it is
  proposed as its own issue.
- No stored data to repair.
- The test: an end-to-end check that orders the chapters, and a
  chapter's authors, on the wizard's "Details" step and reads the Review
  panel before any reload.
- Backport: the same files and listeners are on 3.5 and 3.4; the diff
  should apply there with little or no change (not tried), with a
  ui-library stable-branch PR each.

Medium: a few lines each in OMP and in ui-library, so two PRs and a
ui-library submodule bump in OMP, plus the end-to-end check.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-review-chapters-old-order/walk.js)
  with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-review-chapters-old-order/lib.js),
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets `eaf024c5`, 2026-10-18, PostgreSQL):
  `node bin/probe.js omp shared/playwright/checks/issues/wizard-review-chapters-old-order/walk.js`.
  It takes the Steps (the title and the two contributors' addresses
  tagged `h19s`) and records the Details list, the Review panel and the
  stored `submission_chapters.seq` and `submission_chapter_authors.seq`
  after each "Done". The argument `neighbour` drives the workflow
  "Chapters" page of submission 12 as `dbarnes` instead; `galleys` (on
  OPS) the galley order as `ccorino`, with two galleys, "PDF" and
  "Poster", each a PDF uploaded as "Preprint Text".
- Walked on OMP `main` and 3.5 with the same result at every step; on
  3.5 the contributor window offers the role as a radio already set to
  "Author".
- The fix was tried on OMP `main` with the ui-library rebuilt, and
  reverted after the runs.
- The author drag was chosen so that "Done" stores it (Cy Marsh and Ben
  Barrow are the book's third and second contributors). Some other
  author drags meet a separate fault, where "Done" leaves an author's
  place in the chapter unsaved
  ([U72 A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U72-chapters-work-type.md#a7),
  [its report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U72-A7-chapter-author-order-change-lost.md)).
- On OPS, the Review "Files" panel read nothing at all after the
  reload. That is a separate fault, already reported: a reloaded
  preprint draft's Review says no files were uploaded
  ([U21 OPS8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-OPS8-OPS9-preprint-reloaded-draft-galley-list.md)).
  So the reload could not confirm the galley order there.
- Way round: what a reload keeps was read in ui-library's
  `SubmissionWizardPage.vue` (`currentStepIndex` watcher calling
  `addAutosaves()`) and `mixins/autosave.js`; the walk's reload had no
  typed field pending.
- Tips: main OMP `5777025be`, `lib/pkp` `042726ebf6`, `lib/ui-library`
  `99abe252`; OPS `f048e747b4`. 3.5 OMP `2d575f250`, `lib/pkp`
  `092ec34b0f`, `lib/ui-library` `2576e00a`. 3.4 read with `git show`
  at pkp's `stable-3_4_0` tips: OMP `e30fa7e38` (2026-10-16), `lib/pkp`
  `a71d6bd2ca`, `lib/ui-library` `ee684b34`; the local 3.4 install's
  older OMP `0aec65441` has the same chapter grid, wizard handler and
  templates (no diff between the two on those paths). 3.3 OMP
  `8e72fc883`, `lib/pkp` `5e84acd11b`.
- 3.3 (code): the older form-by-form wizard
  (`templates/submission/form/step3.tpl` holds the chapter grid) has no
  Review step and no `review-chapters.tpl`.
- Introduced: `SubmissionWizardPageOMP.vue` and its three listeners, and
  OMP's `chapters` state with `review-chapters.tpl`, were added with the
  new wizard (commits by Nate Wright, 2022-10-19 and 2022-10-31, merged
  2022-12-14 in `pkp/omp#1259` and `pkp/ui-library#241`, both opened by
  asmecher); later commits to the Vue file only reformatted it.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched for the
  symptom (wizard review chapters order, chapter reorder, wizard
  chapters) and for `saveSequence`, `chapter:added`,
  `SubmissionWizardPageOMP`; `pkp/pkp-lib#10526` (chapter authors read
  out of order, fixed) and `pkp/pkp-lib#8924` (wizard suggestions) are
  other faults.
- Not driven: MySQL (the order comes from stored sequence numbers, read
  with `ORDER BY`); 3.4 and 3.3 on screen; the wizard as an editor.
