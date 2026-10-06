# Previewing an unpublished book, its chapter pages carry no notice that they are a preview

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: none (code; no chapter pages)
- **Introduced** `pkp/omp#1350` for `pkp/pkp-lib#8679` · [5d855f74fe](https://github.com/pkp/omp/commit/5d855f74feeb2a86206a6493568a8ea620c50401) · 2023-02-28 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U69 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a17)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor who previews an unpublished book sees "This is a preview and
has not been published. View submission" at the top of the book's page.
A chapter's page opened from that preview shows no such notice, and so
no link back to the submission.

When the book carries a date, the chapter's page also reads "Published
{date}" or "Forthcoming {date}", as the book's page does, so it looks
like a public page. A book carries a date when it was published and
then unpublished, or is scheduled, or its "Date Published" was typed in
"Catalog Entry".

Readers are not affected: to them the address answers "404 Not Found".

It needs a chapter with its own page in a book, or a version, that is
not published. A chapter has its own page when "Show this chapter on
its own page and link to that page from the book's table of contents."
is ticked in its window; the box is unticked on a new chapter.

## Impact

- **Lost.** The warning that the page is not public, and the "View
  submission" link back to the workflow. No data or work.
- **Who.** Editors, assistants and the author previewing an unpublished
  book or an unpublished or scheduled version, on each chapter page
  they open.
- **Way round.** None needed: the book's page carries the notice, and
  the browser's back button returns to it.

Low: a missing notice on a page only the people preparing the book see.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OMP `main`, freshly loaded. Submission
  14, "From Bricks to Brains: The Embodied Cognitive Science of LEGO
  Robots", is published; its "Chapter 1: Mind Control—Internal or
  External?" is the dataset's only chapter with its own page.
- The dataset's unpublished books have no chapter with its own page, so
  step 3 unpublishes this one.

1. Sign in as `dbarnes` (Press editor).
2. Open submission 14's workflow,
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=14`.
3. Press "Unpublish" and, in the window that asks "Are you sure you
   don't want this to be published?", "Unpublish".
4. Press the publication's "Preview", beside "Publish". The book's page
   opens under "This is a preview and has not been published. View
   submission".
5. In the table of contents press "Chapter 1: Mind Control—Internal or
   External?".

**Expected:** the chapter's page opens under the same notice, "This is
a preview and has not been published. View submission".

**Observed:** the chapter's page,
`…/en/catalog/book/14/chapter/54`, opens with no notice above its
title. Its side column reads "Published" and the date the book had
before step 3 ("October 1, 2026" on the walk's dataset), as the book's
page in step 4 does.

Signed out, the same address answers "404 Not Found".

## Cause

The preview notice is printed by the book's page template alone: OMP
[`templates/frontend/objects/monograph_full.tpl`](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/templates/frontend/objects/monograph_full.tpl#L78-L84)
lines 78–84 print `submission.viewingPreview` when the shown
publication's status is not published.
[`chapter.tpl`](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/templates/frontend/objects/chapter.tpl#L38-L52),
the chapter page's template, has only the older-version notice (lines
38–52).

When previews came to OMP (`pkp/pkp-lib#5299`, 2022) a chapter page of
an unpublished book answered 404, so it needed no notice.
[5d855f74fe](https://github.com/pkp/omp/commit/5d855f74feeb2a86206a6493568a8ea620c50401)
(`pkp/pkp-lib#8679`, "Chapter landing pages preview not possible")
changed `CatalogBookHandler` alone: `setChapter()` no longer asks for a
published publication, and `getSourceChapter()` looks through all of
the book's publications. That commit first let a chapter's page open in
a preview, and the page has never carried the notice: a defect, not a
regression.

Reach:

- Every chapter page of a publication that is not published: an
  unpublished book, a scheduled one, and a new version being prepared
  for a published book (each on screen).
- A new version's chapter page shows the older-version notice instead,
  "This is an outdated version published on {today}. Read the most
  recent version.", alone (on screen, on 3.5 and, with "DOI Versioning"
  "Yes", on `main`). That is the wrong notice the
  [new version's preview report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U13-OPS1-new-version-preview-called-outdated.md)
  describes for the book's page; its fix left `chapter.tpl` to this
  report.
- On `main`, on a press with "DOI Versioning" "No", a new version's
  chapter page fails on the server before any notice shows
  ([separate report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U69-A19-older-version-chapter-page-server-error.md)).

## Proposed fix

Recommended: give `chapter.tpl` the book page's preview notice, and
make the older-version notice its `{elseif}`
([fix-a17.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/chapter-page-dates-and-preview-notice/fix-a17.diff)):

```diff
+	{* Indicate if this is only a preview *}
+	{if $publication->getData('status') !== \PKP\submission\PKPSubmission::STATUS_PUBLISHED}
+		<div class="cmp_notification notice">
+			{capture assign="submissionUrl"}{url page="dashboard" op="editorial" workflowSubmissionId=$monograph->getId()}{/capture}
+			{translate key="submission.viewingPreview" url=$submissionUrl}
+		</div>
+
 	{* Notification that this is an old version *}
-	{if $currentPublication->getId() !== $publication->getId()}
+	{elseif $currentPublication->getId() !== $publication->getId()}
```

The block is `monograph_full.tpl`'s, line for line. The `{elseif}` is
the shape OJS's `article_details.tpl` has and the new version's preview
report proposes for the book's page: a preview shows the preview notice
alone. The "Published {date}" line stays as it is, as on the book's
page; the notice above it is what says the page is not public.

Tried on `main`: the unpublished book's chapter page and the scheduled
book's chapter page opened under "This is a preview and has not been
published. View submission", and a new version's chapter page under
that notice alone. Neighbour checks, the same with the fix in and out:
a published chapter's page shows no notice, and an older published
version's chapter page keeps "This is an outdated version published on
2024-12-31. Read the most recent version.".

**Alternatives:**

- Keeping two separate `{if}` blocks, as the book's page has today,
  would print both notices on a new version's chapter page, the fault
  of the other report.

**What goes with it:**

- A backport: the diff applies as written to 3.5. On 3.4 it applies
  too, but the backport must change the link's line: 3.4 has no
  `dashboard/editorial` address, and its `monograph_full.tpl` builds
  the link with `{url page="workflow" op="access" path=$monograph->getId()}`.
- Themes: the OMP checkout holds one theme, `plugins/themes/default`,
  which does not override `frontend/objects/chapter.tpl`. A theme
  outside the checkout that overrides the template keeps its own copy.
- The guard: an e2e scenario in U69: an unpublished book's chapter page
  carries the preview notice, and a published one none.

Small: one block copied into one template, with no data repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/chapter-page-dates-and-preview-notice/walk.js)
  takes these Steps on OMP on an install freshly loaded from the default
  dataset, beside those of two other reports about the chapter page,
  then the neighbour checks (the older version's chapter page; a new,
  unpublished version's preview and chapter page):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/chapter-page-dates-and-preview-notice/walk.js`
  (`PHASES=a17` takes these Steps alone).
- The fix was tried with `node bin/try-fix.js apply …/fix.diff omp`,
  the same script, then `revert`: `fix.diff` holds the three reports'
  diffs, tried together in one walk on `main`, and the neighbour checks
  read the same with the fix in and out.
- Where the walk differed from the Steps: none for steps 1 to 5. For
  the neighbour checks on `main` the script first saves "DOI
  Versioning" "Yes" (Settings › Distribution › "DOIs" › "Setup"), since
  with "No" the older and the new version's chapter pages fail on the
  server; 3.5 has no such setting and no such failure.
- Walked on `main` and `stable-3_5_0` (OMP), PostgreSQL; nothing here
  depends on the database. Datasets: pkp/datasets fetched at 92050d9
  (2026-10-01). OJS and OPS have no chapters.
- Tips: OMP `main` 3b0ecf794 (lib/pkp 3dc90c81a6); OMP `stable-3_5_0`
  b24879c3d (lib/pkp 1fb843f491); OMP `stable-3_4_0` 0aec65441 (lib/pkp
  df13621c2d); OMP `stable-3_3_0` 8e72fc883.
- Code reads: `chapter.tpl` and `monograph_full.tpl` on each line: 3.5
  and 3.4 print the preview notice in `monograph_full.tpl` only; 3.4's
  `CatalogBookHandler` lets whoever may preview open an unpublished
  publication and its chapters (5d855f74fe is in every release from
  3.4.0). 3.3 has no `chapter.tpl` and no chapter address. The chapter
  window's template (`templates/controllers/grid/users/chapter/form/chapterForm.tpl`)
  and `ChapterForm::initData()` for the box's wording and its unticked
  start. Themes: `find` for `chapter.tpl` in the OMP checkout.
- Introduced: `git log --grep 8679` and `git show` of 5d855f74fe
  (`CatalogBookHandler.php` only). `git blame` on `chapter.tpl` lines
  38–52 shows the template never had a preview notice.
- Upstream search 2026-10-01, pkp/pkp-lib and pkp/omp: "chapter landing
  page preview", "chapter preview notice", and the search of the new
  version's preview report for `viewingPreview`. `pkp/pkp-lib#8679`
  (closed, fixed) is the 404 the chapter page gave in preview, not the
  notice.
- Not driven: the author's and the assistants' preview (the same
  template); 3.4; a book whose date was only typed in "Catalog Entry"
  (the walk's books were unpublished or scheduled).
