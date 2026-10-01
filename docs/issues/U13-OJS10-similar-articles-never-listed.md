# Readers never see "Similar Articles" under an article, though "Recommend Similar Articles" is on

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** three changes, each enough on its own: `pkp/pkp-lib#12196` for `pkp/pkp-lib#11557` · [32317b87cf](https://github.com/pkp/pkp-lib/commit/32317b87cffa2d4b17d8550c7b1ecb71aa94ee03) · 2026-01-13 · Antti-Jussi Nygård (ajnyga); `pkp/ojs#5308` for `pkp/pkp-lib#12245` · [da7c68874e](https://github.com/pkp/ojs/commit/da7c68874ee68d46f4ed7a672ff390cc49aec35a) · 2026-02-17 · Alec Smecher (asmecher); `pkp/pkp-lib#13106` for `pkp/pkp-lib#13080` · [4155f5be39](https://github.com/pkp/pkp-lib/commit/4155f5be39d10d2229bf6c4ae303f6770cf7363b) · 2026-07-30 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** U13 [OJS10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A journal turns on "Recommend Similar Articles". Two of its published articles share a keyword, and a reader opens one of them. The article page shows no "Similar Articles" list, and no error. The plugin searches for the wrong words ("Array"), only among articles that have no issue or an unpublished one, and only for articles that contain every single word of the article's keywords.

So the list never shows an article in a published issue, whatever keywords it shares, so for a journal that publishes in issues it never appears. Read in the code, not walked: an article published without an issue whose title, abstract, keywords or author names contain the word "array" would be listed under every article with keywords, though unrelated.

Released versions show the list; the next release from `main` (3.6) would ship the fault.

## Impact

- **Lost:** the list that leads readers from an article to the journal's articles on the same subjects, with its link to a similarity search.
- **Who:** every reader of a journal that has turned the plugin on, on every article with keywords. The plugin is off by default.
- **Way round:** none on the page. A reader can type the keywords into the journal's Search page.

Medium: an optional reader feature would stop working, silently, for every journal that uses it once 3.6 ships. It would be high if the plugin were on by default.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`. Its two published articles are submission 1, "Signalling Theory Dividends" (keywords "Social Transformation" and "Professional Development"), and submission 17, "Antimicrobial, heavy metal resistance and plasmid profile of coliforms isolated from nosocomial infections in a hospital in Isfahan, Iran" (no keywords), both in "Vol. 1 No. 2 (2014)". Steps 3 to 5 give submission 17 one of submission 1's keywords. "Recommend Similar Articles" is off in the dataset, so step 2 turns it on.

As the editor:

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Recommend Similar Articles". The notice reads "The plugin "Recommend Similar Articles" has been enabled."
3. Open submission 17. Under "Publication", "Title & Abstract", press "Unpublish", then "Unpublish" in the confirmation.
4. Open "Metadata". In "Keywords", type "Social Transformation" and press Enter, then press "Save".
5. Press "Schedule For Publication". In "Review Publishing Details", leave the details as filled (issue "Vol. 1 No. 2 (2014)"), press "Confirm", then "Publish". [3.5: one "Schedule For Publication" confirmation with "Publish".]

As a reader:

6. Sign out. Open the article page of "Signalling Theory Dividends" (`/index.php/publicknowledge/article/view/mwandenga-signalling-theory`).
7. Open the article page of submission 17 (`/index.php/publicknowledge/article/view/17`).

**Expected:** under each article, the section "Similar Articles". On article 1's page it reads:

```
Similar Articles
Vajiheh Karbasizaed, Antimicrobial, heavy metal resistance and plasmid profile of coliforms isolated from nosocomial infections in a hospital in Isfahan, Iran , Journal of Public Knowledge: Vol. 1 No. 2 (2014)
You may also start an advanced similarity search for this article.
```

On submission 17's page it lists "Alan Mwandenga, Amina Mansour, Nicolas Riouf, The Signalling Theory Dividends: A Review Of The Literature And Empirical Evidence , Journal of Public Knowledge: Vol. 1 No. 2 (2014)", with the same closing line.

**Observed:** both pages answer 200 and show the article without the section. The server logs nothing.

## Cause

`RecommendBySimilarityPlugin::buildTemplate()` joins the article's keywords from `getSimilarityTerms()` into a search phrase. It then lists the journal's other articles that the submissions collector matches with `searchPhrase()`. It goes wrong in three places.

**The words.** `getSimilarityTerms()` reads the keywords with `Repo::controlledVocab()->getBySymbolic()` and leaves `$asEntryData` at its default. The plugin was written in [91f5234e2b](https://github.com/pkp/ojs/commit/91f5234e2bf8c74fec759f684c0a04abcca8c827) when that default returned the keyword names. [32317b87cf](https://github.com/pkp/pkp-lib/commit/32317b87cffa2d4b17d8550c7b1ecb71aa94ee03) flipped the default to `Repository::AS_ENTRY_DATA`, so each keyword now arrives as an array (`['name' => 'Social Transformation', …]`). `implode(' ', …)` turns two keywords into the phrase "Array Array", and the collector looks for "array".

**The articles.** [da7c68874e](https://github.com/pkp/ojs/commit/da7c68874ee68d46f4ed7a672ff390cc49aec35a) replaced `filterByStatus([Submission::STATUS_PUBLISHED])` with `filterByLatestPublished(true)`. That filter (`APP\submission\Collector::getQueryBuilder()`) serves the home page's continuous-publication list. It keeps a submission whose current publication is published and has no issue or an issue not yet published (`whereNull('publication_cp.issue_id')->orWhere('pi.published', false)`). So every article in a published issue, the ordinary case, is dropped. The same commit used `filterByCurrentPublicationStatus([PKPPublication::STATUS_PUBLISHED])` in `DOIPubIdExportPlugin`, which is what this list needs too.

**Every word.** [4155f5be39](https://github.com/pkp/pkp-lib/commit/4155f5be39d10d2229bf6c4ae303f6770cf7363b) made `PKP\submission\Collector::searchPhrase()` require every word of the phrase, for the editorial dashboard's search (`pkp/pkp-lib#13080`). The plugin's phrase is all the article's keywords, split into words (up to 20). A candidate must now contain every word of every keyword, so an article sharing one keyword of two no longer counts as similar. Up to 3.5 any one word was enough.

The third cause was checked on screen with only the plugin's two changes applied. Submission 17's phrase is "Social Transformation", and article 1 contains both words, so 17's page listed article 1. Article 1's phrase has four words, and article 17 lacks "Professional" and "Development", so article 1's page still listed nothing.

Reach:

- With today's code, the list under every article with keywords would show any article without an issue, or in an unpublished issue, whose title, abstract, keywords or author names contain "array": an unrelated article (checked in the code; the dataset has none).
- No other caller of `getBySymbolic()` in OJS, OMP or OPS and their `lib/pkp` relies on the old default: the publication's metadata form and the native XML export want entry data (checked in the code).
- `getSimilarityTerms()` merges the languages' keyword lists with `+=`, which keeps all of the first language's keywords but drops the second language's first N, N being the first language's count. 3.4 had the same line, and 3.5 merged with `array_merge()` (checked in the code).
- da7c68874e made the same swap in two other places. In `SitemapHandler` it drops every article from the journal's sitemap ([U20 OJS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U20-search-engine-metadata-and-analytics.md#ojs2), its own report). In `CounterReportAR1` it narrows the usage report's issue filter the same way (checked in the code, not driven). Each needs its own one-line change.
- The other callers of `searchPhrase()` (the editorial dashboard, the submissions API, the publication statistics) keep requiring every word, as `pkp/pkp-lib#13080` intended; the fix leaves them so (checked on screen for the dashboard's search).
- `main` lists the matches by submission date, newest first. Up to 3.5 they were ranked by how many keywords they matched, but that ranking was removed with the old search index in the search rebuild. That is outside this fix.
- ["Recommend Articles by Author" never shows its list](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs4) for a different reason, in a different plugin's template. The two fixes share no code.

## Proposed fix

A proposal; the team decides. The diff is [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/similar-articles-never-listed/fix.diff):

1. In `RecommendBySimilarityPlugin::getSimilarityTerms()`, ask `getBySymbolic()` for the names (`asEntryData: false`), and merge the languages with `array_merge()` as 3.5 did.
2. In `buildTemplate()`, keep articles whose current publication is published, as `DOIPubIdExportPlugin` does since the same commit.
3. In `PKP\submission\Collector::searchPhrase()`, add an optional `$matchAnyKeyword` (default `false`) that joins the per-word conditions with OR inside one nested `where`. Only the plugin passes `true`.

```diff
 use PKP\plugins\Hook;
+use PKP\publication\PKPPublication;
 …
-                [Locale::getLocale(), $submission->getData('locale'), Locale::getPrimaryLocale()]
+                [Locale::getLocale(), $submission->getData('locale'), Locale::getPrimaryLocale()],
+                asEntryData: false
 …
-            $searchTerms += $localeSearchTerms;
+            $searchTerms = array_merge($searchTerms, $localeSearchTerms);
 …
-            ->filterByLatestPublished(true)
-            ->searchPhrase($searchPhrase, static::MAX_SEARCH_KEYWORDS);
+            ->filterByCurrentPublicationStatus([PKPPublication::STATUS_PUBLISHED])
+            ->searchPhrase($searchPhrase, static::MAX_SEARCH_KEYWORDS, matchAnyKeyword: true);
```

```diff
     public ?int $maxSearchKeywords = null;
+    public bool $matchAnyKeyword = false;
 …
-    public function searchPhrase(?string $phrase, ?int $maxSearchKeywords = null): AppCollector
+    public function searchPhrase(?string $phrase, ?int $maxSearchKeywords = null, bool $matchAnyKeyword = false): AppCollector
     {
         $this->searchPhrase = $phrase;
         $this->maxSearchKeywords = $maxSearchKeywords;
+        $this->matchAnyKeyword = $matchAnyKeyword;
 …
-            $keywords->map(
+            $q->where(fn (Builder $q) => $keywords->map(
                 fn ($keyword) => $q->where(
 …
-                        )
+                        ),
+                    boolean: $this->matchAnyKeyword ? 'or' : 'and'
                 )
-            );
+            ));
```

Entry data stays `getBySymbolic()`'s default, as `pkp/pkp-lib#11557` wants; the plugin asks for the names explicitly. A separately named collector method (say `searchAnyWord()`) would avoid a boolean argument but duplicate `searchPhrase()`'s state and its DOI handling; the optional parameter is recommended, since it sits beside `$maxSearchKeywords`, which only this plugin passes, and reads clearly as a named argument at the call.

The fix was tried on OJS `main`. Steps 6 and 7 then showed exactly the Expected lists, and the dataset's unpublished submissions that carry the same keywords (2, 4 and 14) were not listed. The editorial dashboard's "Search submissions" for "Transformation pigs" listed only submission 2, which carries both words, with the fix in and with it out.

**Alternatives:**

- Read `$publication->getData('keywords')` and pluck `name`, as the Citation Style Language and JATS plugins do. That works as well for part 1 but drops the plugin's choice of languages.
- Run one collector query per keyword and merge the results in the plugin. That means many queries and paging by hand.
- Revert `pkp/pkp-lib#13080` for every caller. That loses the dashboard relevance it was made for.
- Go back to `filterByStatus([Submission::STATUS_PUBLISHED])`. `pkp/pkp-lib#12245` moved away from the submission's status on purpose.

**What goes with it:**

- The guard: an e2e check, as [U13 Rule 20b](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs10) describes it, that turns the plugin on, gives two published articles a shared keyword, and reads the section on both pages. OJS has no test for this plugin today. pkp-lib has no test of `searchPhrase()`; one in both modes would need a database test.
- No backport: 3.5, 3.4 and 3.3 carry none of the three changes.
- No data repair: nothing stored is wrong.

Medium, because the fix spans pkp-lib and OJS and adds an argument to a shared collector method, though each part is a line or two.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/similar-articles-never-listed/walk.js) takes Steps 1 to 7 through the screens on an install freshly loaded from the default dataset. It records each screen, the keywords and publication status from the database, the section's text and search link, and the server log lines for each article page. Run: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/similar-articles-never-listed/walk.js`.
- Fix trial: [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/similar-articles-never-listed/trial.sh) applies fix.diff with `node bin/try-fix.js apply`, walks the Steps and [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/similar-articles-never-listed/neighbour.js) (the dashboard's search) with it, reverts, and walks neighbour.js without it; the Cause's partial result is the Steps walked with fix.diff's plugin hunks alone, without `matchAnyKeyword: true`.
- `main` walked at OJS bade233f73 (2026-09-30), pkp-lib 2e377d27fc (2026-09-29), on PostgreSQL (its `dbscripts/xml/version.xml` reads 3.6.0.0, the release the Summary names): the walk saw the Observed above on both article pages. The fault does not depend on the database.
- 3.5 walked at OJS 92b9a16b48 (2026-09-30), pkp-lib a9c76aed62 (2026-09-29): both sections listed as in Expected, with nothing logged. Code read: `RecommendBySimilarityPlugin::buildTemplate()` takes the terms from `ArticleSearch::getSimilarityTerms()`, which plucks each keyword's `name`, filters by `Submission::STATUS_PUBLISHED`, and the collector matches any word and ranks by matches.
- 3.4 read in the code at OJS `stable-3_4_0` 9571d8fde7 (2026-09-25), pkp-lib df13621c2d (2026-09-25): terms from `SubmissionKeywordDAO::getKeywords()` as strings, `filterByStatus()`, any-word matching. 3.3 read at OJS `stable-3_3_0` 9fdb9bcf9a (2026-09-18), pkp-lib d446601ebe (2026-09-13): the plugin's own any-word query on the search index, published submissions only.
- Introduced: `git blame` on `RecommendBySimilarityPlugin.php` gives 975ef869b0 (2025-07-30, a review round of 91f5234e2b) for the `getBySymbolic()` call. Its default was `!Repository::AS_ENTRY_DATA` from [90918476a2](https://github.com/pkp/pkp-lib/commit/90918476a25de3cabf6ea364476e9c6d54220d89) (`pkp/pkp-lib#10833` for `pkp/pkp-lib#1550`) until 32317b87cf (merged 2026-01-15 with `pkp/pkp-lib#12196`) flipped it. Line 122 (`filterByLatestPublished`) gives da7c68874e, merged 2026-02-19 with `pkp/ojs#5308`. `Collector.php` lines 672 to 680 give 4155f5be39, merged 2026-07-30 with `pkp/pkp-lib#13106`.
- Upstream, the nearest (pkp/pkp-lib, pkp/ojs, pkp/ui-library, 2026-10-01): `pkp/pkp-lib#13267` (closed: the reviewer's "View All Submission Details" showing "Array, Array" for keywords after `pkp/pkp-lib#11557`, a different caller), `pkp/pkp-lib#12141` (open: the two recommendation plugins' pagination templates), `pkp/pkp-lib#9897` (open: caching) and `pkp/pkp-lib#8633` (closed 2023: an older matching fault). None is this fault.
- Unverified: the unrelated-article case ("array") and the second-language keywords dropped by `+=` (read in the code, not walked).
