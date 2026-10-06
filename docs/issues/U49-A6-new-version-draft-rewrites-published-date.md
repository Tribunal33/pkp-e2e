# Creating a new version, still unpublished, makes the reader page say "Published {today} — Updated on {real date}"

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the first version is taken by list order, not by date)
- **Introduced** `pkp/ojs#3131`, `pkp/omp#979`, `pkp/ops#158` for `pkp/pkp-lib#5328` · [9fcf842157](https://github.com/pkp/ojs/commit/9fcf84215758ec5d22128d2cb40574bb3a4b4378) · 2021-05-04 · Nate Wright (NateWr)
- **Upstream** `pkp/pkp-lib#13245` (open, no fix PR) reports this fault on the article page and names this cause; it also asks about versions published out of order
- **Tracked in** spec U49 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U49-publish-schedule-and-versions.md#a6)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor who presses "Create New Version" on a published article, book
or preprint changes its public page at once, before the new version is
published. The date under "Published" ("Posted" on a preprint server)
changes from the real date to "{the day the page is read} — Updated on
{the real date}". The page still shows the old version, and its
"Versions" list gains no entry.

The first date is not the day the draft was created: it is the date of
each visit, so it moves forward every day until the new version is
published or deleted. Nobody is warned. The page's citation tags keep
the real date.

## Impact

- **Lost.** The publication date a reader sees on the page. The page's
  citation tags for indexes ("citation_date", "DC.Date.created") and
  the "How to cite" block keep the real date.
- **Who.** Every reader of a published item for which an editor has
  started a new version and not yet published it, on any install; no
  setting is needed.
- **Way round.** Only for the editor, who is not told: publishing or
  deleting the new version restores the line. Typing a date into the
  new version's own date box also hides the fault, but only a date on
  or after the real publication date (an earlier one gives the same
  fault), and that date then becomes the new version's publication
  date.

Medium: the date readers see is wrong, silently, for as long as a new
version stays a draft, which lifts it from low; it stays below high
because the dates indexes read are right. If the citation tags, the
"How to cite" block or the DOI deposits carried the false date, it
would be high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded. The steps use
  one published item per app, each in one version:
  - OJS: submission 17, "Antimicrobial, heavy metal resistance and
    plasmid profile of coliforms isolated from nosocomial infections in
    a hospital in Isfahan, Iran"; reader page
    `/index.php/publicknowledge/article/view/17`.
  - OMP: submission 14, "From Bricks to Brains: The Embodied Cognitive
    Science of LEGO Robots"; reader page
    `/index.php/publicknowledge/catalog/book/14`.
  - OPS: submission 2, "The Facets Of Job Satisfaction: A Nine-Nation
    Comparative Study Of Construct Equivalence"; reader page
    `/index.php/publicknowledge/preprint/view/2`.
- The dataset dates each item the day the dataset was built. Steps 2
  to 4 give it a fixed past date, so that the dates below differ from
  the day of the walk.

1. Sign in as `dbarnes` and open the submission's workflow,
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<id>`.
2. Press "Unpublish" (OPS: "Unpost") and the same in the window that
   asks "Are you sure you don't want this to be published?".
3. Under "Publication" ("Preprint" on OPS) open "Publication Settings"
   (OJS), "Catalog Entry" (OMP) or "Preprint entry" (OPS), type
   2024-12-31 in "Publication Date" (OMP: "Date Published", OPS: "Date
   Posted") and press "Save". [3.5: on OJS the page is "Issue" and the
   box "Date Published".]
4. Press "Schedule For Publication" (OJS), "Publish" (OMP) or "Post"
   (OPS), then "Publish" ("Post") in the window that asks.
5. Signed out, open the reader page. Under "Published" ("Posted") it
   reads "2024-12-31" (OMP: "December 31, 2024").
6. As `dbarnes`, under "Publication" ("Preprint"), press "Create New
   Version". The window offers the published version to copy from, its
   stage and "Minor Revision"; keep them and press "Confirm". [3.5: the
   "Create New Version" button on the publication's "Title & Abstract"
   page, then "Yes".]
7. Signed out, open the reader page again.

**Expected:** the line is unchanged, "2024-12-31" (OMP: "December 31,
2024"), as the page still serves the one published version.

**Observed** (walked on 2026-10-02):

```
OJS  Published  2026-10-02 — Updated on 2024-12-31
OMP  Published  October 2, 2026 — Updated on December 31, 2024
OPS  Posted     2026-10-02 — Updated on 2024-12-31
```

The page otherwise still shows version 1.0, and its "Versions" list
holds "2024-12-31 (Version of Record 1.0)" ("Author Original 1.0" on
OPS) alone.

## Cause

The reader page handlers pick the "first" version as the earliest by
date among all of the submission's versions, unpublished ones included,
and a version that was never published has no date:

```php
// ojs pages/article/ArticleHandler.php, ArticleHandler::view()
// (the same in omp CatalogBookHandler::book() and ops PreprintHandler::view())
// Get the earliest published publication
$firstPublication = $article->getData('publications')->reduce(function ($a, $b) {
    return empty($a) || strtotime((string) $b->getData('datePublished')) < strtotime((string) $a->getData('datePublished')) ? $b : $a;
}, 0);
```

[ArticleHandler.php L266–269](https://github.com/pkp/ojs/blob/b84f8e2e44/pages/article/ArticleHandler.php#L266-L269),
[CatalogBookHandler.php L204–207](https://github.com/pkp/omp/blob/3b0ecf794/pages/catalog/CatalogBookHandler.php#L204-L207),
[PreprintHandler.php L184–187](https://github.com/pkp/ops/blob/c8af945bb7/pages/preprint/PreprintHandler.php#L184-L187).

`Repository::version()` in pkp-lib copies a version "without the
datePublished", so the new draft's date is null. `strtotime('')` is
`false`, and in PHP `false < 1735603200` is true, so the draft wins the
comparison and becomes `$firstPublication`. The templates
(`article_details.tpl`, `monograph_full.tpl`, `preprint_details.tpl`)
then see that the shown version is not the first and print
`submission.updatedOn` with the draft's date as the first date. That
date is null, and pkp-lib's `date_format` modifier
(`PKPTemplateManager::smartyDateFormat()`, `new Carbon($string)`)
formats null as the current time.

The reduce replaced 3.3's `reset(...->getData('publications'))`, the
first version in list order, when the handlers moved to repositories
(`pkp/pkp-lib#5328`; at those commits the files were still
`ArticleHandler.inc.php`, `CatalogBookHandler.inc.php` and
`PreprintHandler.inc.php`). Its comment states the intent, "the
earliest published publication", but nothing restricts it to published
versions.

Reach:

- Only the visible date line. `$firstPublication` is assigned by these
  three handlers and read by the three templates alone. The citation
  tags (Google Scholar, Dublin Core) take the shown version's or the
  issue's date; "How to cite" takes `getOriginalPublication()`, which
  reads published versions only; JATS, OAI-PMH, the DOI deposits and
  the sitemap read each version's own date (read in the code). On 3.5,
  with the draft in place, the page heads carried "2024-12-31" or the
  issue's year while the line read "2026-10-02 — Updated on 2024-12-31"
  (seen in the browser).
- Every theme that prints the line from `$firstPublication`; the
  default themes were seen in the browser, themes outside the app
  repos were not read.
- Any unpublished version with a date earlier than the first published
  one wins the same way, for example a draft whose date an editor typed
  in (read in the code).
- Not reached: OMP's chapter pages take their first date from
  `getChaptersFirstPublishedDate()`, which reads published versions
  only (read in the code).

## Proposed fix

Recommended: in each of the three handlers, choose the first version
among the published versions only, and fall back to the shown version
when none is published (an editor's preview of a scheduled item)
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-draft-rewrites-published-date/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-draft-rewrites-published-date/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-draft-rewrites-published-date/fix-ops.diff)):

```diff
-        // Get the earliest published publication
-        $firstPublication = $article->getData('publications')->reduce(function ($a, $b) {
+        // Get the earliest published publication. Only published versions
+        // count: a new version has no date until it is published, and an
+        // empty date would win the comparison.
+        $firstPublication = collect($article->getPublishedPublications())->reduce(function ($a, $b) {
             return empty($a) || strtotime((string) $b->getData('datePublished')) < strtotime((string) $a->getData('datePublished')) ? $b : $a;
-        }, 0);
+        }, 0) ?: $publication;
```

(OMP: `$submission` and `$this->publication`; OPS: `$preprint` and
`$publication`.) The handler is where `$firstPublication` is made, so
every theme gets the right version without a template change.
`getPublishedPublications()` is what the "Versions" list already uses
to mean "published", and the comparison stays what the introducing
change meant: the earliest date among published versions, which is
also what `pkp/pkp-lib#13245` expects for versions published out of
order.

Tried on `main`, all three apps: step 7 read the unchanged
"2024-12-31" ("December 31, 2024"). After the new version was
published, the page read "2024-12-31 — Updated on 2026-10-02" and the
older version's page "2024-12-31", the same with and without the fix.

**Alternatives:**

- `$submission->getOriginalPublication()` in pkp-lib, which "How to
  cite" already uses: one call instead of the reduce, but it takes the
  published version with the lowest ID, not the earliest date, so a
  version published out of order would give a different first date
  from the one the line means.
- Guard the templates against a null first date: each theme, including
  third-party ones, would need it, and the handler would still name a
  draft as the first version.

**What goes with it:**

- Nothing to repair. No API or hook changes.
- A version unpublished after a later one was published no longer
  counts as the first, so the later version's page reads its own date
  alone rather than "{the unpublished version's date} — Updated on
  {its date}". That matches what the reader can still open.
- A backport: the three diffs apply as written to 3.5 (checked with
  `patch --dry-run`) and the code is the same on 3.4.
- A test: reader page unchanged after "Create New Version".

Medium: one line in each of three handlers, in three repos, with a
test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-draft-rewrites-published-date/walk.js)
  takes these Steps on OJS, OMP and OPS on an install freshly loaded
  from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/new-version-draft-rewrites-published-date/walk.js`.
- Where the walk differed from the Steps: the reader pages are read in
  a fresh signed-out browser while `dbarnes` stays signed in elsewhere.
  No request failed and no page script failed. On 3.5 the lines read
  the same; the page shows no "Versions" list while one version is
  published.
- Unverified: the way round by a typed date, and the "How to cite"
  block, are read in the code only. That the first date is the day of
  the visit was not seen in a browser either, since the walks ran on
  the day the drafts were created; the Carbon call settles it.
- Walked on `main` and `stable-3_5_0` (OJS, OMP, OPS), PostgreSQL;
  nothing here depends on the database. Datasets: pkp/datasets fetched
  at e8dafbc (2026-10-02).
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a); OMP `main` 3b0ecf794
  and OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS
  091fb65453, OMP 9c5e24246, OPS 38b61882d3 (lib/pkp cf3f984335);
  `stable-3_4_0` OJS 75cc2d488b, OMP 0aec65441f, OPS acd8ae704b (lib/pkp
  32b0f4b4af); `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc8836, OPS
  c5532e2161 (lib/pkp f6ab331645).
- Code reads: the reduce in the three handlers, the date line in the
  three templates, `smartyDateFormat()` and pkp-lib
  `Repository::version()` (`setData('datePublished', null)`) on `main`,
  3.5 and 3.4, the same on all three; the three 3.3 handlers. On
  `main`: the Google Scholar and Dublin Core plugins, the Citation
  Style Language plugin and `PKPSubmission::getOriginalPublication()`;
  a search of the three app repos and pkp-lib for `firstPublication`
  and for the same comparison found only the handlers and templates.
- Introduced: `git blame` on the reduce names OJS 9fcf842157
  ("Refactor submissions and publications to use repositories",
  2021-05-04), OMP
  [928796ee85](https://github.com/pkp/omp/commit/928796ee85006797b535312e07e7792f7c5ca740)
  (2021-06-08) and OPS
  [48d5e43981](https://github.com/pkp/ops/commit/48d5e43981216543604b5b2d0a8cfdb500ae7a2a)
  (2021-06-07), both "Refactor publication, submission services to
  repositories"; read them with the `*.inc.php` paths or `--follow`.
  Merged by `pkp/ojs#3131`, `pkp/omp#979` and `pkp/ops#158`
  (2021-06-10); in every release from 3.4.0.
- Upstream: `pkp/pkp-lib#13245` (opened 2026-08-28) gives the same
  steps for OJS and points at the same reduce. This report adds the
  steps for OMP and OPS, the walk on `main` and 3.5, that the first
  date is the day of the visit, the reach to machine-read dates, the
  introducing change and a tried fix. Searched 2026-10-02 in pkp/pkp-lib,
  pkp/ojs, pkp/omp and pkp/ops; no fix PR found.
