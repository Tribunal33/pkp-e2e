# With "Recommend Similar Articles" on, article pages never show "Similar Articles"

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12196` for `pkp/pkp-lib#11557` · [32317b87cf](https://github.com/pkp/pkp-lib/commit/32317b87cffa2d4b17d8550c7b1ecb71aa94ee03) · 2026-01-13 · Antti-Jussi Nygård (ajnyga); and `pkp/ojs#5308` for `pkp/pkp-lib#12245` · [da7c68874e](https://github.com/pkp/ojs/commit/da7c68874ee68d46f4ed7a672ff390cc49aec35a) · 2026-02-17 · Alec Smecher (asmecher). Each change alone empties the list; the fix is in the OJS plugin only
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [OJS10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

With the "Recommend Similar Articles" plugin on (it is off on a new
journal), no article page shows "Similar Articles", even when another published
article in the journal carries exactly the same keywords. The page opens
normally, with no list and no message.

Readers lose the list that leads from an article to related ones in the
journal, and the journal has nothing to set that brings it back. It
happens on every article, whether it sits in a published issue or was
published without one.

## Impact

- **Lost.** The list of related articles under each article, and its
  link to "an advanced similarity search". Nobody is told.
- **Who.** Every visitor, signed in or not, on the article page, in a
  journal with the plugin on.
- **Way round.** None on screen. The plugin has no settings; a reader
  can only type the article's keywords into Search.

Medium: an optional list under the article is missing on every page it
should show on, silently, while the article itself is complete. It
would be high if the plugin were on by default.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`: journal `publicknowledge`,
  whose issue "Vol. 1 No. 2 (2014)" is published.
- Article 1 is published in that issue. Its page shows the title "The
  Signalling Theory Dividends: A Review Of The Literature And Empirical
  Evidence" ("Signalling Theory Dividends" in the submission lists). Its
  published version carries the keywords "Professional Development" and
  "Social Transformation" (its unpublished newer version carries the
  same). No other published article has keywords, so steps 2 to 4
  publish a second article with the same two.

Steps:

1. Sign in as `rvaca` (Journal manager). Settings › Website ›
   "Plugins": tick "Recommend Similar Articles". Sign out.
2. Sign in as `dbarnes`. Open submission 5, "Genetic transformation of
   forest trees" (Production).
3. Publication › "Metadata": under "Keywords" type "Professional
   Development" and press Enter, then "Social Transformation" and Enter;
   "Save".
4. "Schedule For Publication": Publication Stage "Version of Record",
   Revision Significance "Major Revision", "Assign To Current/Back
   Issue", Issue "Vol. 1 No. 2 (2014)", "Confirm", then "Publish". Sign
   out. [3.5: Publication › "Issue" › "Assign to Issue", pick "Vol. 1
   No. 2 (2014)", "Save"; then "Schedule For Publication" and
   "Publish".]
5. Signed out, open article 1's page
   (`/index.php/publicknowledge/article/view/1`).
6. Open article 5's page (`/index.php/publicknowledge/article/view/5`).

**Expected.** Under article 1, "Similar Articles" lists "Diaga Diouf,
Genetic transformation of forest trees, Journal of Public Knowledge:
Vol. 1 No. 2 (2014)", followed by "You may also start an advanced
similarity search for this article.". Under article 5, the same heading
lists "Alan Mwandenga, Amina Mansour, Nicolas Riouf, The Signalling
Theory Dividends: A Review Of The Literature And Empirical Evidence,
Journal of Public Knowledge: Vol. 1 No. 2 (2014)".

**Observed.** Both pages answer 200 and show the article in full, with
no "Similar Articles" anywhere on the page.

The same steps on 3.5 show both lists, as expected. Article 17, which
has no keywords, shows no list on main or on 3.5.

## Cause

`RecommendBySimilarityPlugin::buildTemplate()`
(`plugins/generic/recommendBySimilarity/RecommendBySimilarityPlugin.php`)
joins the article's keywords from `getSimilarityTerms()` into a search
phrase and asks the submission collector for the journal's published
articles that match it. Two later changes broke the two halves, and
each one alone empties the list. They make one report because both sit
in this one method, one diff fixes both, and neither fix alone brings
the list back.

The keywords. `getSimilarityTerms()` reads them with
`Repo::controlledVocab()->getBySymbolic()` (line 81), and
`buildTemplate()` passes the result to `implode(' ', …)` (line 106).
Since pkp-lib
[32317b87cf](https://github.com/pkp/pkp-lib/commit/32317b87cffa2d4b17d8550c7b1ecb71aa94ee03)
("Use single format for keywords in publication object"),
`getBySymbolic()` returns each entry as entry data
(`['name' => …]` with its identifier and source) by default
(`$asEntryData = Repository::AS_ENTRY_DATA`), where it returned the
names before. That change moved its pkp-lib callers to the new shape,
but not this OJS plugin. So the phrase is "Array Array", and the
collector looks for articles containing the word "array".

Nothing reaches the server log: PHP's "Array to string conversion"
warning is dropped, because the hook runs while the article template
is rendered, and `PKPTemplateManager` sets Smarty's `error_reporting` to
`E_ALL & ~E_NOTICE & ~E_WARNING` (line 180).

The filter. The collector is limited with `filterByLatestPublished(true)`
(line 122). [da7c68874e](https://github.com/pkp/ojs/commit/da7c68874ee68d46f4ed7a672ff390cc49aec35a)
("Review and fix use of PKPSubmission::STATUS_...") put it in place of
`filterByStatus([Submission::STATUS_PUBLISHED])`. That OJS filter
(`APP\submission\Collector::getQueryBuilder()`) serves the home page's
latest publications. It keeps only a submission whose current
publication is published and has no issue or an issue not yet published
(`whereNull('publication_cp.issue_id')->orWhere('pi.published', false)`).
So an article in a published issue is never a candidate. The change
meant to read the publication's status instead of the submission's.
The collector's filter for that is `filterByCurrentPublicationStatus()`.

The two faults show apart on screen. Without the fix, an article
published with "Don't Assign To An Issue" with the same two keywords
passes the filter and is still not listed, because of the keywords
alone.

Reach:

- Article pages with the plugin on: every article with keywords
  (on screen: articles 1 and 5, and an article outside any issue).
- The same swap in da7c68874e reaches two other callers, each its own
  feature and left out of this fix (code). OJS's
  sitemap (`pages/sitemap/SitemapHandler.php` line 57) lists no article
  of a published issue; it is tracked as U20
  [OJS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U20-search-engine-metadata-and-analytics.md#ojs2).
  The COUNTER AR1 report (`plugins/reports/counter/classes/reports/CounterReportAR1.php`
  line 102) keeps no article when it is filtered by published issues
  (code, not driven).
- No other caller of `getBySymbolic()` on `main` turns the result into
  text (code). `PKPMetadataForm` and the Native XML export read the
  entry data, as the change intended. OMP and OPS do not ship this
  plugin.
- Partial keyword matches stay unlisted after the fix. Since pkp-lib
  4155f5be39 (`pkp/pkp-lib#13106` for `pkp/pkp-lib#13080`,
  2026-07-30), the collector's search needs every
  word of the phrase to match. Before, any one word was enough
  (`pkp/pkp-lib#8710`, which moved this plugin onto the collector).
  So with the fix, only articles that hold every word of the article's
  keywords are listed. On screen, an article with only "Social
  Transformation" was not listed under article 1. On 3.5 a single
  shared keyword is enough (code). It is a separate fault with its own
  fix in pkp-lib, and is left out of this one.
- `getSimilarityTerms()` line 75 still checks the submission's status
  (`Submission::STATUS_PUBLISHED`) before it reads the keywords. It
  gates only the article being read, and for an article published the
  ordinary way the two statuses agree, so the fix leaves it. An article
  published while its submission stays in review (the "publish
  manuscript under review" flow of `pkp/pkp-lib#12245`) has a page,
  since `ArticleHandler` checks the publication's status, but would get
  no list (code, not driven).
- Stored data: none.

## Proposed fix

Ask `getBySymbolic()` for the names, as it still offers, and filter on
the current publication's status, as da7c68874e itself does in
`DOIPubIdExportPlugin` (line 142) and the pkp-lib side of
`pkp/pkp-lib#12245` does in `PKPDoiController` and
`PKPStatsPublicationController`. Two lines in one OJS file
([`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/recommend-similar-list-never-shown/fix.diff)):

```diff
--- a/plugins/generic/recommendBySimilarity/RecommendBySimilarityPlugin.php
+++ b/plugins/generic/recommendBySimilarity/RecommendBySimilarityPlugin.php
@@ -25,6 +25,7 @@
 use PKP\facades\Locale;
 use PKP\plugins\GenericPlugin;
 use PKP\plugins\Hook;
+use PKP\publication\PKPPublication;
 
 class RecommendBySimilarityPlugin extends GenericPlugin
 {
@@ -82,7 +83,8 @@
                 ControlledVocab::CONTROLLED_VOCAB_SUBMISSION_KEYWORD,
                 Application::ASSOC_TYPE_PUBLICATION,
                 $submission->getCurrentPublication()->getId(),
-                [Locale::getLocale(), $submission->getData('locale'), Locale::getPrimaryLocale()]
+                [Locale::getLocale(), $submission->getData('locale'), Locale::getPrimaryLocale()],
+                asEntryData: false
             )
         );
         foreach ($allSearchTerms as $localeSearchTerms) {
@@ -119,7 +121,7 @@
             ->getCollector()
             ->excludeIds([$submissionId])
             ->filterByContextIds([$context->getId()])
-            ->filterByLatestPublished(true)
+            ->filterByCurrentPublicationStatus([PKPPublication::STATUS_PUBLISHED])
             ->searchPhrase($searchPhrase, static::MAX_SEARCH_KEYWORDS);
 
         $offset = ($rangeInfo->getPage() - 1) * $rangeInfo->getCount();
```

Tried on `main`: with the fix, the Steps show the Expected lists on both
pages. A wider check ran with the fix in and out. It added the same two
keywords to submission 6, published with "Don't Assign To An Issue",
and to submission 9, scheduled into the unpublished "Vol. 2 No. 1
(2015)". Submission 2, in review, already holds both. With the fix,
article 1 lists articles 6 (without an issue link) and 5, and never 9
or 2; article 17 still lists nothing. Without it, no page shows a list,
article 6's included.

**Alternatives**

- Go back to `filterByStatus([Submission::STATUS_PUBLISHED])`. It works,
  but it reads the submission's status, which `pkp/pkp-lib#12245`
  replaces with the publication's.
- Take the names from the publication's `keywords`, as 3.5's
  `ArticleSearch::getSimilarityTerms()` does with `pluck('name')`. It
  also works, but it reads every language, where the plugin asks for
  the reader's, the submission's and the journal's primary one.

**What goes with it**

- Left out: the sitemap and COUNTER AR1 calls of the same filter
  (Cause), which belong to their own features and their own fixes; the
  same one-line change fits them.
- Left out: whether a partial keyword match should count again (Cause)
  is a separate decision. It would need an "any word" option on the
  collector's `searchPhrase()` in pkp-lib for this plugin.
- Left out: line 75's status check (Cause). Moving it to
  `$submission->getCurrentPublication()->getData('status')` would cover
  the "publish manuscript under review" articles; not tried.
- Test: an e2e scenario in U13, an article page with the plugin on and
  published articles that share its keywords, one in an issue and one
  outside any issue, beside a scheduled one that must stay out.

A proposal. Small: two lines in one plugin file, tried.

## Evidence

- Kept script, which takes the Steps through the screens on an install
  freshly loaded from PKP's default test dataset (pkp/datasets 38ab955,
  the `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/recommend-similar-list-never-shown/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/recommend-similar-list-never-shown/walk.js),
  with its helpers in `lib.js` beside it, run with
  `PROBE_FEATURE=issues-ir8 PROBE_AGENT=ir8 node bin/probe.js ojs shared/playwright/checks/issues/recommend-similar-list-never-shown/walk.js`.
  It records each article page's status, the list's items and links,
  the advanced-search link and the error lines the server logged while
  it ran. With `neighbour` as its argument it adds the wider check of
  the Proposed fix and an article with only "Social Transformation"
  (submission 15, published in "Vol. 1 No. 2 (2014)").
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/recommend-similar-list-never-shown/fix.diff ojs`, then `walk.js` and `walk.js neighbour` (the latter also without the fix).
- Tips: OJS `main` bade233f73 (2026-09-30) with pkp-lib 2e377d27fc;
  OJS `stable-3_5_0` 92b9a16b48 (2026-09-30) with pkp-lib a9c76aed62;
  `stable-3_4_0` 9571d8fde7 (2026-09-25); `stable-3_3_0` 9fdb9bcf9a
  (2026-09-18).
- 3.5 (walked, and read): the same script on the `stable-3_5_0`
  install, with the publish step taken through 3.5's "Issue" page; both
  pages showed the list. There the plugin takes the keywords from
  `ArticleSearch::getSimilarityTerms()`, which plucks each entry's
  `name`, and filters with `filterByStatus([Submission::STATUS_PUBLISHED])`.
  Its collector ORs the words and orders by the number matched.
  3.5 carries the pkp-lib change to `getBySymbolic()` (51e256b560), but
  this plugin does not call it there.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0`
  `plugins/generic/recommendBySimilarity/RecommendBySimilarityPlugin.php`
  takes the keywords from `ArticleSearch::getSimilarityTerms()`
  (`SubmissionKeywordDAO::getKeywords()`, names) and filters by
  `Submission::STATUS_PUBLISHED`; `upstream/stable-3_3_0`
  `RecommendBySimilarityPlugin.inc.php` builds its own query with
  `filterByStatus(STATUS_PUBLISHED)` over the search index.
- Introduced: `git blame` on the plugin's lines 81 and 122. Line 81
  dates from 975ef869b0 (2025-07-30), when
  `getBySymbolic()` still returned names by default (pkp-lib 90918476a2,
  `$asEntryData = !Repository::AS_ENTRY_DATA`). `git log -S` on the
  default gives pkp-lib 32317b87cf. `commits/<sha>/pulls` gives
  `pkp/pkp-lib#12196` (merged 2026-01-15) and `pkp/ojs#5308` (merged
  2026-02-19). Partial matches: `git log -L` on the collector's
  search block gives pkp-lib 4155f5be39 (`pkp/pkp-lib#13106` for
  `pkp/pkp-lib#13080`) over
  1d49d30e97 (`pkp/pkp-lib#8710`, "use a "OR" based search instead to
  bring more results").
- Upstream search (2026-10-01), issues and pull requests, open and
  closed, in pkp/pkp-lib, pkp/ojs and pkp/ui-library, for terms such as
  "similar articles", "recommend similar", "recommendBySimilarity",
  "getSimilarityTerms" and "filterByLatestPublished". Nearest:
  `pkp/pkp-lib#9897` (open, caching the list), `pkp/pkp-lib#12141`
  (open, pagination of the two recommendation plugins),
  `pkp/pkp-lib#8633` (closed 2023, articles sharing one keyword missing,
  before the collector was used) and `pkp/pkp-lib#13080` (closed, the
  editorial search's relevance, the change behind the partial matches);
  none is this fault.
- Not driven: OMP and OPS (no such plugin); MySQL (the fault does not
  depend on the database); the sitemap and COUNTER AR1 lines of the
  Cause; the line 75 check; partial matches on 3.5, read in the code
  only.
