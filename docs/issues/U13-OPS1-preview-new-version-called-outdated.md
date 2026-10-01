# Previewing a new version of a posted preprint or published book also says "This is an outdated version"

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: none (code: no preview of an unpublished version there)
- **Introduced** commits under `pkp/pkp-lib#5299`, with no pull request found: [fa646e5cf7](https://github.com/pkp/ops/commit/fa646e5cf78a7c66dd4aa7252e70c3e332e915eb) (OPS, 2022-11-25), [2004cab1d5](https://github.com/pkp/omp/commit/2004cab1d5b55cb524c9236359ef7e1646a4b3c5) (OMP, 2022-11-24) · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-01)
- **Tracked in** U13 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ops1), U69 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An editor who makes a new version of a posted preprint or a published book and presses "Preview" sees the page under two notices: "This is a preview and has not been published. View submission" and, under it, "This is an outdated version published on {today}. Read the most recent version." The version is not outdated: it is the newest one, not yet published, and the date is the day of the preview. Its "most recent version" link leads away from the preview to the published, older version. A journal's preview of a new version shows the first notice alone.

The public pages are right, and the notice is gone once the version is posted or published. The fix is the same small change in the server's and the press's page template, which live in two code repositories, hence the medium effort.

## Impact

- **Lost**: nothing; the editor is told something false about the version being checked.
- **Who**: the server's or press's managers, editors and moderators who preview a new version before posting it; every time, on every server and press that makes versions.
- **Way round**: none needed.

Low: a wrong notice on a page only those who may preview see.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (or `stable-3_5_0`), OPS and OMP, server and press `publicknowledge`; OJS, journal `publicknowledge`, for the control.
- OPS: submission 11, "Learning Sustainable Design through Service", and OMP: submission 14, "From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots", each have one posted or published version. The steps make a second one.
- OJS: submission 1, "Signalling Theory Dividends", already has a published version 1.0 and an unpublished version 1.1.

OPS:

1. Sign in as `dbarnes`. Open submission 11 and its "Title & Abstract".
2. Press "Create New Version". Keep the window's choices and press "Confirm" (3.5: press "Yes").
3. On the new version ("Author Original 1.1"), press "Preview".

OMP:

1. Sign in as `dbarnes`. Open submission 14 and its "Title & Abstract".
2. Press "Create New Version". Keep the window's choices and press "Confirm" (3.5: press "Yes").
3. On the new version ("Version of Record 1.1"), press "Preview".

OJS (control):

1. Sign in as `dbarnes`. Open submission 1 and, in the side menu, "Version of Record 1.1" (3.5: the "Publication" entry, which shows version 2).
2. Press "Preview".

**Expected**: the preview opens under the one notice "This is a preview and has not been published. View submission".

**Observed**: on the server (`…/preprint/view/11/version/21`) and on the press (`…/catalog/book/14/version/19`) the preview opens under two notices, the second dated the day of the preview:

```
This is a preview and has not been published. View submission
This is an outdated version published on 2026-10-01. Read the most recent version.
```

On the server the label line under them reads "Preprint / 2026-10-01 (Author Original 1.1)" (3.5: "Preprint / Version 2").

The notice's "most recent version" link opens `…/preprint/view/11` and `…/catalog/book/14`, the published version 1.0.

Control: the journal's preview of version 1.1 (`…/article/view/mwandenga-signalling-theory/version/2`) shows the first notice alone.

## Cause

OPS `templates/frontend/objects/preprint_details.tpl` (lines 71–90) and OMP `templates/frontend/objects/monograph_full.tpl` (lines 78–95) print the two notices from two independent `{if}` blocks. The first prints `submission.viewingPreview` when the shown publication's `status` is not `STATUS_PUBLISHED`. The second prints `submission.outdatedVersion` when `$currentPublication->getId() !== $publication->getId()`. The current publication is the latest published one, so an unpublished new version passes that test too, and the notice's link (`getBestId()`, the plain address) opens that published version.

The second notice's date is `$publication->getData('datePublished')|date_format:$dateFormatShort`. An unpublished version has no `datePublished`, and the `date_format` modifier pkp-lib registers, `PKPTemplateManager::smartyDateFormat()`, builds `new Carbon($string)`, which for a null value is the current time: hence today's date.

An unpublished version is a preview, never an older version. OJS `templates/frontend/objects/article_details.tpl` (lines 78–93) says so by chaining the two blocks with `{elseif}`, as it has from the commit that brought the preview to OJS, [af7cb999ab](https://github.com/pkp/ojs/commit/af7cb999ab229cc6a1cbe82469897a6f0ca22e6e) (`pkp/pkp-lib#5565`, 2020). When `pkp/pkp-lib#5299` brought the preview to OMP and OPS, the preview block was added above the existing older-version block as its own `{if}`, without the `{elseif}`.

Reach:

- OMP's chapter page, `templates/frontend/objects/chapter.tpl` line 39: the same older-version test, but no preview notice at all, so a chapter of an unpublished new version gets only "This is an outdated version…" (code). The missing preview notice is U69 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a17); whichever fix adds it there should chain the two with `{elseif}` the same way. Left out here.
- The PDF reader (pkp/pdfJsViewer) runs its own test, `isLatestPublication` (`submissionCallback()` line 141 in OJS and OPS, `viewCallback()` line 97 in OMP):
  - OJS and OPS, on screen: the reader opened from a preview's "PDF" shows "This is an outdated version published on … Read the most recent version." too, on OPS with the date left empty ("published on . "). The viewer under it stays empty there, the fault of U13 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a2), which lives in the same plugin; the notice belongs with that fix. Left out here.
  - OMP, on screen and in the code: the preview's file link answers "404 Not Found", because `CatalogBookHandler::download()` (line 427) refuses a file of an unpublished version before the reader is reached, so OMP's reader never shows this notice.

## Proposed fix

Chain the older-version notice to the preview notice with `{elseif}`, as OJS's `article_details.tpl` does, in OPS's `preprint_details.tpl` and OMP's `monograph_full.tpl` ([fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preview-new-version-called-outdated/fix-ops.diff), [fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preview-new-version-called-outdated/fix-omp.diff)):

```diff
 			{translate key="submission.viewingPreview" url=$submissionUrl}
 		</div>
-	{/if}
-
 	{* Notification that this is an old version *}
-	{if $currentPublication->getId() !== $publication->getId()}
+	{elseif $currentPublication->getId() !== $publication->getId()}
 		<div class="cmp_notification notice">
```

Tried on `main`: with the change in, the steps' previews on the server and the press show the preview notice alone. Both with and without the change, once the new version is posted the older version's page still reads "This is an outdated version published on 2026-09-30. Read the most recent version.", the current page carries no notice, and the preview of a submission never published shows the preview notice alone.

**Alternatives**:

- Leave the outdated notice out when `datePublished` is empty: fixes the date but keeps two tests that must agree, where OJS already has the one-branch pattern.
- Move the notice block into a shared pkp-lib template for all three apps: removes the drift for good, but each app's page and theme include their own copy today, so it is a larger change than the fault needs.

**What goes with it**:

- Backport: the same lines on `stable-3_5_0` and `stable-3_4_0`; on 3.4 the preview link's address differs (`workflow/access`), so the diff applies with an offset or by hand, the change being the same.
- Themes that override these two templates keep their own copy and the two notices until they follow (not checked).
- Test: an e2e check on each app that a new version's preview shows the preview notice alone.

Medium: two app repositories (OPS and OMP), per the scale, though each change is two lines and repairs no data.

## Evidence

- Kept walk: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preview-new-version-called-outdated/walk.js) (helpers in [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preview-new-version-called-outdated/lib.js)), on an install freshly loaded from the default dataset: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/preview-new-version-called-outdated/walk.js` (3.5: `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front). It also opens the preview's first file, for the reader lines under Cause.
- Fix tried on `main`: `node bin/try-fix.js apply <fix-<app>.diff> <app>` for OPS and OMP, then the walk.
- Dataset: the walks loaded pkp/datasets 38ab955 (2026-09-30), PostgreSQL. The fault does not depend on the database.
- Tips walked or read: `main` OJS [bade233f73](https://github.com/pkp/ojs/commit/bade233f73), OMP [3b0ecf794](https://github.com/pkp/omp/commit/3b0ecf794), OPS [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb7); 3.5 OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48), OMP [3081c9b00](https://github.com/pkp/omp/commit/3081c9b00), OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd); 3.4 OMP [0aec65441](https://github.com/pkp/omp/commit/0aec65441), OPS [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b); 3.3 OMP [8e72fc883](https://github.com/pkp/omp/commit/8e72fc883), OPS [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161).
- 3.4 (code): the same two `{if}` blocks on `stable-3_4_0` in both templates, the preview link pointing at `workflow/access`; fa646e5cf7 and 2004cab1d5 are in the branch's history.
- 3.3 (code): no preview on either app. OPS `pages/preprint/PreprintHandler.inc.php` line 113 and OMP `pages/catalog/CatalogBookHandler.inc.php` line 83 refuse an unpublished publication, and the templates hold only the older-version block.
- Introduced: `git blame` on the preview block gives fa646e5cf7 (OPS, "pkp/pkp-lib#5299 Add preview to OPS") and 2004cab1d5 (OMP, "pkp/pkp-lib#5299 Add preview to OMP"), each adding the block above the 2019 older-version block (4b3f98dad1 in OPS, 9cc962b167 in OMP, `pkp/pkp-lib#4870`) without changing its `{if}`. GitHub's `commits/<sha>/pulls` answers no pull request for either commit.
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ops, pkp/omp and pkp/ui-library, issues and PRs, by "preview outdated version", "outdated version notice", "preview new version notice", "is an outdated version" and by `viewingPreview` and `outdatedVersion`. Nearest, not the same fault: `pkp/pkp-lib#5299` (the feature request that added the preview) and `pkp/pkp-lib#11608` (which version counts as current).
