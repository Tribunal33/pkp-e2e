# Previewing a new version of a posted preprint or published book also calls it "an outdated version published on" today

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: none (code; no preview of an unpublished version)
- **Introduced** `pkp/pkp-lib#5299` · [2004cab1d5](https://github.com/pkp/omp/commit/2004cab1d5b55cb524c9236359ef7e1646a4b3c5) (OMP, 2022-11-24) and [fa646e5cf7](https://github.com/pkp/ops/commit/fa646e5cf78a7c66dd4aa7252e70c3e332e915eb) (OPS, 2022-11-25) · ajnyga (ajnyga)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ops1); spec U69 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

Previewing a new, unposted version of a posted preprint shows "This is
a preview and has not been published. View submission" and under it
"This is an outdated version published on {today's date}. Read the most
recent version." The version has no publication date, so the line
prints the day of the preview. The version is not outdated; it is the
next one, and "most recent version" leads to the posted version's page.

Previewing a new, unpublished version of a published book shows the
same two notices, with the same date and the same link to the published
version's page. A journal shows the preview notice alone.

The editor or author checking the new version is told it is outdated
and was published today, on every preview of a new version. Readers
never see the line.

## Impact

- **Lost.** Nothing. The preview page tells whoever checks it that the
  version they are preparing is outdated and was published on today's
  date; its "most recent version" link opens the published version.
- **Who.** A server or press manager, an editor, or an author who
  previews a new version of a posted preprint or published book, on
  every such preview.
- **Way round.** None needed: the line goes once the version is
  published.

Low: a misleading line on a page only the people preparing a new version
see.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, freshly loaded. On the preprint
  server, submission 2, "The Facets Of Job Satisfaction: A Nine-Nation
  Comparative Study Of Construct Equivalence", is posted in one version,
  "Author Original 1.0". On the press, submission 14, "From Bricks to
  Brains: The Embodied Cognitive Science of LEGO Robots", is published in
  one version, "Version of Record 1.0".
- Nothing else; step 3 adds the new version the dataset lacks.

Preprint server (OPS):

1. Sign in as `dbarnes` (Preprint Server manager).
2. Open submission 2's workflow,
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=2`.
3. Under "Preprint" in the menu, press "Create New Version". In the
   "Create New Version" window keep what it offers ("Author Original
   1.0", "Author Original (AO)", "Minor Revision") and press "Confirm". The menu now lists
   "Author Original 1.1", "Status: Unpublished".
   [3.5: "Create New Version" is a button above the publication's pages;
   it asks "Are you sure you want to create a new version?", answered
   "Yes", and the new version shows as "Version: 2".]
4. Under "Author Original 1.1", open "Title & Abstract" and press
   "Preview". The browser opens `…/en/preprint/view/2/version/21`.

   [3.5: "Title & Abstract" is listed once, for the version "All
   Versions" picks, which is now the new one; "Preview" sits in the
   row of "Status: Unpublished", "Version: 2" and "All Versions", beside
   "Post".]

Press (OMP): the same steps as `dbarnes` (Press editor) on submission
14, under "Publication". In step 3 the window offers "Version of Record
1.0", "Version of Record (VoR)" and "Minor Revision", kept as they are;
the new version is "Version of Record 1.1", and "Preview" opens
`…/en/catalog/book/14/version/19` (on 3.5 "Preview" sits beside
"Publish").

**Expected:** the page opens under "This is a preview and has not been
published. View submission" alone.

**Observed:** on both, under that notice:

```
This is an outdated version published on 2026-10-01. Read the most recent version.
```

2026-10-01 was the day of the walk; the new version has no publication
date. "most recent version" links to `…/en/preprint/view/2` and
`…/en/catalog/book/14`, the published version's page.

On a journal (OJS, the same dataset), submission 1 already holds an
unpublished "Version of Record 1.1": its "Preview" shows the preview
notice alone.

## Cause

OPS
[`templates/frontend/objects/preprint_details.tpl`](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/templates/frontend/objects/preprint_details.tpl#L71-L90)
and OMP
[`templates/frontend/objects/monograph_full.tpl`](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/templates/frontend/objects/monograph_full.tpl#L78-L95)
test the two notices in two separate `{if}` blocks: the preview notice
when the shown publication is not published, then the outdated notice
whenever the shown publication is not `$currentPublication`. OPS
`PreprintHandler::view()` passes `$preprint->getCurrentPublication()` and
OMP `CatalogBookHandler::book()` passes
`$submission->getCurrentPublication()` as `$currentPublication`: the
submission's `currentPublicationId`, which the protected
`PKP\submission\Repository::getCurrentPublicationIdByPublications()`
sets to the last published version in version order (stage, major,
minor; not by date), falling back to the latest version when none is
published. So a new, unpublished version is never the current one while
an older version is published, and its preview gets both notices.

The date comes from the new version's empty `datePublished`.
`|date_format` runs `PKPTemplateManager::smartyDateFormat()`, which
formats `new Carbon($string)`; `new Carbon(null)` is now, so the empty
date prints as today
([lib/pkp `PKPTemplateManager.php`](https://github.com/pkp/pkp-lib/blob/3dc90c81a638238c2241f5d3086f93865cb943b8/classes/template/PKPTemplateManager.php#L2422-L2425)).

OJS's
[`article_details.tpl`](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/templates/frontend/objects/article_details.tpl#L78-L93)
has the same two notices chained with `{elseif}`: the outdated notice is
only considered when the page is not a preview. OJS got that shape with
its preview (`pkp/pkp-lib#5565`,
[af7cb999ab](https://github.com/pkp/ojs/commit/af7cb999ab229cc6a1cbe82469897a6f0ca22e6e),
2020). When previews came to OMP and OPS (`pkp/pkp-lib#5299`, the two
commits in Introduced), the preview notice was added as its own `{if}`
in front of the outdated notice, which dates from 2019 (versioning),
when an unpublished version could not be opened on these pages.

Reach:

- The book's chapter page of an unpublished version,
  [`chapter.tpl`](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/templates/frontend/objects/chapter.tpl#L38-L52),
  has the same outdated test and no preview notice at all. On 3.5, a
  chapter of the new version opened from the preview reads "This is an
  outdated version published on 2026-10-01. …" alone (walked). On
  `main` that page answers a server error on the default dataset
  (`ChapterDAO::getCurrentPublicationChapterDoi()`, a separate fault in
  the [U69 register](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a19)),
  so the notice cannot be seen there; the template is the same (code).
- The file viewers decide their own outdated banner from
  `isLatestPublication`, also without a preview test: `pdfJsViewer` in
  all three apps, `htmlArticleGalley` (OJS) and `htmlMonographFile`
  (OMP). Opened from a preview, OPS's PDF viewer reads "This is an
  outdated version published on . Read the most recent version." (the
  raw empty date), on `main` and 3.5; OJS's PDF viewer reads the date
  version 1.1 carries in the dataset, on `main` and 3.5. OMP's viewers
  were not reached: the new version's file link answered "404 Not
  Found". These are plugins with repositories of their own.
- Published pages are not touched: the current version shows no notice,
  and an older published version's page keeps its notice with its own
  date (walked, OMP and OPS).

## Proposed fix

Recommended: chain the two notices as OJS does, in OPS
`preprint_details.tpl` and OMP `monograph_full.tpl`
([fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-preview-outdated-notice/fix-ops.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-preview-outdated-notice/fix-omp.diff)):

```diff
 			{translate key="submission.viewingPreview" url=$submissionUrl}
 		</div>
-	{/if}
 
 	{* Notification that this is an old version *}
-	{if $currentPublication->getId() !== $publication->getId()}
+	{elseif $currentPublication->getId() !== $publication->getId()}
```

Tried on `main` on OMP and OPS: the preview showed the preview notice
alone. A check of the published pages, with the fix in and out: after
the new version was published, the current page showed no notice and the older
version's page still read "This is an outdated version published on
2026-09-30. …".

The rule lives in each app's page template, the only place the two
notices are decided, and the change copies OJS's twin template line for
line. An unpublished older version (one that was unpublished after a
newer one was published) then shows the preview notice alone on its
preview, as on a journal.

**Alternatives:**

- Printing nothing for an empty date (a guard in `smartyDateFormat()`)
  would leave "This is an outdated version published on ." on the
  preview: the notice itself is the error.
- Testing the publication's status inside the outdated condition works
  too, but departs from OJS's shape for the same two notices.

**What goes with it:**

- Left out of this fix, for separate reports: OMP's `chapter.tpl`, which
  needs the same `{if}` preview notice `{elseif}` outdated notice shape.
  That change also adds the chapter page's missing preview notice, a
  fault of its own, and it cannot be tried on `main` while that page
  answers a server error. The viewer plugins' banners, which need a
  preview test in each plugin, in repositories of their own.
- No stored data changes.
- A backport: both diffs apply as written to 3.5 and 3.4.
- The guard: an e2e scenario in U13 and U69: a new version's preview
  shows the preview notice alone, and an older published version's page
  keeps the outdated notice.

Small: the same two-line change in one template in each of OMP and OPS,
copying OJS, with no data repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-preview-outdated-notice/walk.js)
  takes the Steps on OPS and OMP and the OJS control on an install
  freshly loaded from the default dataset; then opens a chapter (OMP)
  and the first file link from the preview; then publishes the new
  version and reads the current and the older version's pages signed out
  (the neighbour check):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/new-version-preview-outdated-notice/walk.js`.
  The fix was tried with `node bin/try-fix.js apply …/fix-ops.diff ops`
  and `…/fix-omp.diff omp`, the same script, then `revert`.
- Walked on `main` and `stable-3_5_0` (OJS, OMP, OPS), PostgreSQL;
  nothing here depends on the database. Datasets: pkp/datasets fetched
  at 38ab955 (2026-09-30).
- Tips: OPS `main` c8af945bb7, OMP `main` 3b0ecf794c (both lib/pkp
  3dc90c81a6), OJS `main` bade233f73 (lib/pkp 2e377d27fc); OPS
  `stable-3_5_0` cf4fce69bd, OMP 3081c9b00, OJS 92b9a16b48 (lib/pkp
  a9c76aed62); OPS `stable-3_4_0` acd8ae704b, OMP 0aec65441 (lib/pkp
  df13621c2d); OPS `stable-3_3_0` c5532e2161, OMP 8e72fc883.
- Code reads: `preprint_details.tpl`, `monograph_full.tpl` and
  `chapter.tpl` on each line: 3.5 and 3.4 have the two separate `{if}`
  blocks; 3.4's `smartyDateFormat()` formats through `new Carbon($string)`
  as on `main`. On 3.3, OPS `PreprintHandler::initialize()` and OMP
  `CatalogBookHandler::initialize()` answer 404 for any unpublished
  publication, and neither template has a preview notice, so no preview
  of a new version exists there. OJS `article_details.tpl` on `main`
  for the `{elseif}`; the viewer plugins' `isLatestPublication`
  assignments on `main`.
- Introduced: `git blame` on the preview block of both templates gives
  2004cab1d5 (OMP) and fa646e5cf7 (OPS), "pkp/pkp-lib#5299 Add preview to
  OMP/OPS"; GitHub lists no PR for either. Both are in every release
  from `3_4_0rc1`, so the fault never worked otherwise: "defect".
- Upstream search 2026-10-01, pkp/pkp-lib, pkp/ops, pkp/omp and
  pkp/ui-library, by "preview outdated", "outdated version", "preview
  published on", "preview notice version", `viewingPreview`,
  `outdatedVersion`: nothing about this fault. `pkp/pkp-lib#11608`
  (choosing the current publication by maturity) changes which version
  is current, not this test.
- Not driven: the author's preview (the same template); OMP's chapter
  page on `main` (server error); OMP's file viewers; 3.4 and 3.3.
