# Previewing a new version of a posted preprint or published book calls it outdated and already published

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: none (code; no preview of an unpublished version)
- **Introduced** `pkp/pkp-lib#5299` · [2004cab1d5](https://github.com/pkp/omp/commit/2004cab1d5b55cb524c9236359ef7e1646a4b3c5) (OMP, 2022-11-24) and [fa646e5cf7](https://github.com/pkp/ops/commit/fa646e5cf78a7c66dd4aa7252e70c3e332e915eb) (OPS, 2022-11-25) · ajnyga (ajnyga)
- **Upstream** none found (2026-10-06)
- **Tracked in** spec U13 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ops1); spec U69 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a4)
- **Checked** 2026-10-06, each branch's tip (the commits in Evidence);
  the OJS control on `main` 2026-10-01, at bade233f73
- **Model** claude-opus-5-5

Update 2026-10-06: the line "This is an outdated version published on
{date}" now also shows the date saved on the new version, once one is
saved, instead of today's.

## Summary

Previewing a new, unposted version of a posted preprint shows "This is
a preview and has not been published. View submission" and under it
"This is an outdated version published on {date}. Read the most recent
version." Until a "Date Posted" is saved on the new version, {date} is
the day of the preview; after that it is the saved date. The version is
not outdated; it is the next one, and "most recent version" leads to
the posted version's page.

Previewing a new, unpublished version of a published book shows the
same two notices and the same link; {date} comes from the version's
"Date Published" in the same way. A journal's preview page shows the
preview notice alone; the PDF viewer opened from a journal's or a
preprint server's preview still carries an outdated banner.

## Impact

- **Lost.** Nothing. The line leads to no wrong step: the notice above
  it says the version is not published, and "most recent version" opens
  the published version's public page, where nothing can be edited or
  decided.
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
5. Back in the workflow, under "Author Original 1.1", open "Preprint
   entry", type `2025-01-15` into "Date Posted" and press "Save".
   [3.5: "Preprint entry" is listed once, as "Title & Abstract" is.]
6. Press "Preview" on that page.

Press (OMP): the same steps as `dbarnes` (Press editor) on submission
14, under "Publication". In step 3 the window offers "Version of Record
1.0", "Version of Record (VoR)" and "Minor Revision", kept as they are;
the new version is "Version of Record 1.1", and "Preview" opens
`…/en/catalog/book/14/version/19` (on 3.5 "Preview" sits beside
"Publish"). In step 5 the page is "Catalog Entry" and the box "Date
Published".

**Expected:** both previews (steps 4 and 6) open under "This is a
preview and has not been published. View submission" alone.

**Observed:** on the preprint server and the press alike, under that
notice, at step 4 (the day of the walk):

```
This is an outdated version published on 2026-10-06. Read the most recent version.
```

and at step 6:

```
This is an outdated version published on 2025-01-15. Read the most recent version.
```

"most recent version" links to `…/en/preprint/view/2` and
`…/en/catalog/book/14`, the published version's page.

On a journal (OJS, the same dataset), submission 1 already holds an
unpublished "Version of Record 1.1": its "Preview" page shows the
preview notice alone; its PDF opened from there carries the outdated
banner (Cause, Reach).

## Cause

OPS
[`templates/frontend/objects/preprint_details.tpl`](https://github.com/pkp/ops/blob/21e41026b254b52a59c81923f9e5d082fc29409a/templates/frontend/objects/preprint_details.tpl#L71-L90)
and OMP
[`templates/frontend/objects/monograph_full.tpl`](https://github.com/pkp/omp/blob/592914b831d7fe7f56aae8ec4f6cdbecec7776bf/templates/frontend/objects/monograph_full.tpl#L78-L95)
test the two notices in two separate `{if}` blocks: the preview notice
when the shown publication is not published, then the outdated notice
whenever the shown publication is not `$currentPublication`. OPS
`PreprintHandler::view()` passes `$preprint->getCurrentPublication()` and
OMP `CatalogBookHandler::book()` passes
`$submission->getCurrentPublication()` as `$currentPublication`. That
is the submission's `currentPublicationId`, which
[`PKP\submission\Repository::updateCurrentPublication()`](https://github.com/pkp/pkp-lib/blob/a7f5e3081bced9ddf0717c752b111396c5117da1/classes/submission/Repository.php#L752-L764)
sets. It takes the ID from the protected
[`getCurrentPublicationIdByPublications()`](https://github.com/pkp/pkp-lib/blob/a7f5e3081bced9ddf0717c752b111396c5117da1/classes/submission/Repository.php#L1503-L1521):
the last published publication in the submission's `publications`, which
are ordered by version stage, major and minor, not by date; or the last
publication when none is published.

So while an older version is published, a new, unpublished version is
never the current one, and its preview gets both notices.

The date is the new version's own `datePublished`, which "Date Posted"
(OPS, `IssueEntryForm`) and "Date Published" (OMP, `CatalogEntryForm`)
save on an unpublished version. A new version starts without one:
[`PKP\publication\Repository::version()`](https://github.com/pkp/pkp-lib/blob/a7f5e3081bced9ddf0717c752b111396c5117da1/classes/publication/Repository.php#L402)
copies the published version and sets `datePublished` to null. While it
is empty, `|date_format` runs `PKPTemplateManager::smartyDateFormat()`,
which formats `new Carbon($string)`; `new Carbon(null)` is now, so the
empty date prints as today
([lib/pkp `PKPTemplateManager.php`](https://github.com/pkp/pkp-lib/blob/a7f5e3081bced9ddf0717c752b111396c5117da1/classes/template/PKPTemplateManager.php#L2422-L2425)).

OJS's
[`article_details.tpl`](https://github.com/pkp/ojs/blob/1f4cef786fd89237bbfc559a00507a013edcfd4d/templates/frontend/objects/article_details.tpl#L78-L93)
has the same two notices chained with `{elseif}`: the outdated notice is
only considered when the page is not a preview. OJS got that shape with
its preview (`pkp/pkp-lib#5565`,
[af7cb999ab](https://github.com/pkp/ojs/commit/af7cb999ab229cc6a1cbe82469897a6f0ca22e6e),
2020). In OMP and OPS the outdated notice dates from versioning (2019),
when an unpublished version could not be opened on these pages. When
previews came to them (`pkp/pkp-lib#5299`, the two commits in
Introduced), the preview notice was added in front of it as its own
`{if}`.

Reach:

- The book's chapter page of an unpublished version,
  [`chapter.tpl`](https://github.com/pkp/omp/blob/592914b831d7fe7f56aae8ec4f6cdbecec7776bf/templates/frontend/objects/chapter.tpl#L38-L52),
  has the same outdated test and no preview notice at all. On 3.5, a
  chapter of the new version opened from the preview reads "This is an
  outdated version published on 2026-10-06. …" alone (walked). On
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
  Found".
- Published pages are not touched: the current version shows no notice,
  and an older published version's page keeps its notice with its own
  date (walked, OMP and OPS).

## Proposed fix

Recommended: chain the two notices as OJS does, in OPS
`preprint_details.tpl` and OMP `monograph_full.tpl`
([fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-preview-outdated-notice/fix-ops.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-preview-outdated-notice/fix-omp.diff);
for OMP 3.4,
[fix-omp-3_4.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-preview-outdated-notice/fix-omp-3_4.diff)):

```diff
 			{translate key="submission.viewingPreview" url=$submissionUrl}
 		</div>
-	{/if}
 
 	{* Notification that this is an old version *}
-	{if $currentPublication->getId() !== $publication->getId()}
+	{elseif $currentPublication->getId() !== $publication->getId()}
```

Tried on `main` on OMP and OPS: both previews, with and without a saved
date, showed the preview notice alone. A check of the published pages,
with the fix in and out: after the new version was published, the
current page showed no notice and the older version's page still read
"This is an outdated version published on 2026-10-05. …".

The book's and the preprint's page each decide the two notices in their
own template, and the change copies OJS's twin template line for line.
It also changes one other case, as wanted: an older version unpublished
after a newer one was published shows the preview notice alone on its
preview, as on a journal, since that page too is a preview, not a
published older version.

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
  fault of its own. The viewer plugins' banners, which need a
  preview test in each plugin, in repositories of their own.
- No stored data changes.
- A backport: both diffs apply as written to 3.5, and `fix-ops.diff` to
  OPS 3.4. OMP 3.4's preview notice links to `workflow`/`access`, not
  `dashboard`/`editorial`, so `fix-omp.diff` does not apply there;
  `fix-omp-3_4.diff` is the same change against that template.
- The guard: an e2e scenario in U13 and U69: a new version's preview
  shows the preview notice alone, with and without a saved date, and an
  older published version's page keeps the outdated notice.

Small: a two-line change in one template per app, copying OJS.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-preview-outdated-notice/walk.js)
  takes the Steps on OPS and OMP and the OJS control on an install
  freshly loaded from the default dataset (steps 1 to 4, then the
  preview's chapter (OMP) and first file link, then steps 5 and 6); then
  publishes the new version and reads the current and the older
  version's pages signed out (the neighbour check):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/new-version-preview-outdated-notice/walk.js`.
  The fix was tried by running the same script with the two diffs
  applied to `main`.
- Walked 2026-10-06 on `main` (OMP, OPS; the OJS control was walked on
  2026-10-01, at bade233f73, and its template is unchanged) and on
  `stable-3_5_0` (OJS, OMP, OPS), PostgreSQL; nothing here depends on the
  database. Datasets: pkp/datasets 5a53d3d (2026-10-05).
- Tips: OPS `main` 21e41026b2 (lib/pkp a7f5e3081b), OMP `main` 592914b83
  (lib/pkp e39fdee199), OJS `main` 1f4cef786f (lib/pkp a7f5e3081b); OPS
  `stable-3_5_0` 38b61882d3, OMP 9c5e24246 (both lib/pkp cf3f984335),
  OJS 4342473090 (lib/pkp 771474347e); OPS `stable-3_4_0` acd8ae704b,
  OMP 0aec65441 (lib/pkp 767353f4fe); OPS `stable-3_3_0` c5532e2161, OMP
  8e72fc883.
- Code reads: `preprint_details.tpl`, `monograph_full.tpl` and
  `chapter.tpl` on each line: 3.5 and 3.4 have the two separate `{if}`
  blocks, and their OMP `CatalogEntryForm` and OPS `IssueEntryForm` the
  `datePublished` box; 3.4's `smartyDateFormat()` formats through `new Carbon($string)`
  as on `main`. On 3.3, OPS `PreprintHandler::initialize()` and OMP
  `CatalogBookHandler::initialize()` answer 404 for any unpublished
  publication, and neither template has a preview notice, so no preview
  of a new version exists there. The diffs checked with `patch
  --dry-run` on 3.5 and 3.4 copies of the templates.
  `Repository::version()` and `updateCurrentPublication()` on `main`
  (lib/pkp a7f5e3081b and e39fdee199 alike). OJS `article_details.tpl` on `main`
  for the `{elseif}`; the viewer plugins' `isLatestPublication`
  assignments on `main`.
- Introduced: `git blame` on the preview block of both templates gives
  2004cab1d5 (OMP) and fa646e5cf7 (OPS), "pkp/pkp-lib#5299 Add preview to
  OMP/OPS"; GitHub lists no PR for either. Both are in every release
  from `3_4_0rc1`.
- Upstream search: pkp/pkp-lib, pkp/ops, pkp/omp and pkp/ui-library on
  2026-10-01, the first three again on 2026-10-06, by the notices' words
  and keys: nothing about this fault. `pkp/pkp-lib#11608`
  (choosing the current publication by maturity) changes which version
  is current, not this test.
- Not driven: the author's preview (the same template); OMP's chapter
  page on `main` (server error); OMP's file viewers; 3.4 and 3.3.
