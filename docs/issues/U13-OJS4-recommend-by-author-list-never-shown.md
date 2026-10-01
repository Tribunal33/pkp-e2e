# Readers never see "Most read articles by the same author(s)" under an article, though the plugin is on

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ojs#4963` for `pkp/pkp-lib#8920` · [c7d20e95dd](https://github.com/pkp/ojs/commit/c7d20e95dde04487c9cf0dce7905d542523e55bb) · 2025-08-01 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** U13 [OJS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A journal turns on "Recommend Articles by Author". A reader then opens an article whose contributor has another published article in the journal. The article page shows everything else, but the list "Most read articles by the same author(s)" is missing. The plugin raises an error on the server while it builds the list; the app catches the error, writes it to the server's error log and serves the page without the list.

The list never appears on any article, and readers and the journal get no message.

Only the development version (`main`) has this fault. Released versions show the list, so no journal running a release meets it today, but the next release would ship it.

## Impact

- **Lost:** the recommendation list that leads readers from an article to the same author's other articles in the journal. Beyond the missing list, each view of such a page writes one error with its stack trace to the server's error log. The page itself answers normally.
- **Who:** every reader of a journal that has turned the plugin on, on the page of every article whose contributor has another published article there. The plugin is off by default.
- **Way round:** none on the page. A reader can find the author's other articles only by searching the journal for the name.

Medium: an optional reader feature would stop working, silently, for every journal that uses it once the next release ships, while the article page itself works. It would be high if the plugin were on by default.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`. Its two published articles share no contributor, so steps 3 to 5 give submission 17 a contributor with the same name as one of submission 1's. "Recommend Articles by Author" is off in the dataset, so step 2 turns it on.

As the editor:

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Recommend Articles by Author". The notice reads "The plugin "Recommend Articles by Author" has been enabled."
3. Open submission 17, "Antimicrobial, heavy metal resistance and plasmid profile of coliforms isolated from nosocomial infections in a hospital in Isfahan, Iran" (published in "Vol. 1 No. 2 (2014)"). Under "Publication", "Title & Abstract", press "Unpublish", then "Unpublish" in the confirmation.
4. Open "Contributors" and press "Add Contributor". Fill in Contributor Type "Person", Given Name "Alan", Family Name "Mwandenga" (a contributor of submission 1, "Signalling Theory Dividends"), Email "u13ojs4@mailinator.com", Country "Canada" and Contributor Roles "Author". Press "Save". [3.5: no Contributor Type.]
5. Press "Schedule For Publication". In "Review Publishing Details", leave the details as filled ("Version of Record (VoR)", "Major Revision", issue "Vol. 1 No. 2 (2014)"), press "Confirm", then "Publish". [3.5: one "Schedule For Publication" confirmation with "Publish".]

As a reader:

6. Sign out. Open the article page of "Signalling Theory Dividends" (`/index.php/publicknowledge/article/view/mwandenga-signalling-theory`).
7. Open the article page of submission 17 (`/index.php/publicknowledge/article/view/17`).

**Expected:** under each article, the section "Most read articles by the same author(s)". On article 1's page it lists:

```
Vajiheh Karbasizaed, Alan Mwandenga, Antimicrobial, heavy metal resistance and plasmid profile of coliforms isolated from nosocomial infections in a hospital in Isfahan, Iran , Journal of Public Knowledge: Vol. 1 No. 2 (2014)
```

On submission 17's page it lists "Alan Mwandenga, Amina Mansour, Nicolas Riouf, The Signalling Theory Dividends: A Review Of The Literature And Empirical Evidence , Journal of Public Knowledge: Vol. 1 No. 2 (2014)".

**Observed:** both pages answer 200 and show the article without the section. On each page view the server logs:

```
Plugin APP\plugins\generic\recommendByAuthor\RecommendByAuthorPlugin failed to handle the hook Templates::Article::Footer::PageFooter
Error: Call to a member function getCurrentPublication() on null in …/cache/t_compile/…articleFooter.tpl.php:38
```

## Cause

`RecommendByAuthorPlugin::callbackTemplateArticlePageFooter()` finds the other published articles and hands them to its template as a `LengthAwarePaginator` over `APP\search\SubmissionSearchResult::newCollection()`. Since the Laravel Scout rebuild of the search, each item of that collection is an array with the keys `submission`, `currentPublication`, `context` and `section` (from pkp-lib's `PKP\search\SubmissionSearchResult::newCollection()`), plus `issue` and `issueAvailable` (added by OJS's subclass).

`plugins/generic/recommendByAuthor/templates/articleFooter.tpl` still reads the keys of the old `ArticleSearch::formatResults()` arrays: `$articleBySameAuthor.publishedSubmission` and `$articleBySameAuthor.journal`. Neither key exists, so `$submission` is null and `{assign var=publication value=$submission->getCurrentPublication()}` throws. `Hook::run()` catches errors raised in plugin code, logs them through `PluginFailureHandler::logIfPluginFailure()` and goes on, so the page renders without the plugin's output.

Two commits of the rebuild's OJS pull request brought this in. [c7d20e95dd](https://github.com/pkp/ojs/commit/c7d20e95dde04487c9cf0dce7905d542523e55bb) ("Adapt articles by same author plugin for ArticleSearch removal") moved the plugin from `ArticleSearch::formatResults()` and `VirtualArrayIterator` to pkp-lib's `\PKP\search\SubmissionSearchResult` and the paginator. In the template it dropped the `article` key but kept `publishedSubmission` and `journal`. Those items had no `issue` key either. [e38f0f4eff](https://github.com/pkp/ojs/commit/e38f0f4effc244311bbafe9c029d0025aa2716f1) ("Move OJS-specific search results formatting to OJS repo") then switched the plugin to OJS's `\APP\search\SubmissionSearchResult`, which adds `issue`, and left the template as it was.

Reach:

- Every article page with at least one match fails. A page without a match never reaches the loop, so it shows nothing and logs nothing (checked on screen).
- The template also assumes every listed article has an issue (`$issue->getBestIssueId()`). The old `formatResults()` listed only articles in a published issue. The new collection keeps every submission whose current publication is published, and on `main` such an article can have no issue ("Don't Assign To An Issue") or an issue not yet published. Once the keys are fixed, such an article among the matches would break the list the same way (checked in the code).
- The plugin counts its matches from any published publication of a submission, but the collection drops a submission whose current publication is not published. So the total the page links count from can exceed the articles listed (checked in the code; outside this fix).
- No other template or plugin in OJS, its `lib/pkp` or its bundled plugins reads `publishedSubmission` or `journal` from search results (checked in the code). The Search page (`templates/frontend/pages/search.tpl`) reads the same collection as `$result.submission` and `$result.context` and lists results correctly (checked on screen).
- ["Recommend Similar Articles" never lists anything](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs10) for a different reason, outside this report.
- No stored data is affected.

## Proposed fix

Read the collection's keys in the template, as the Search page does. Show the issue link only for an article in a published issue, and otherwise name the journal without linking to an issue page that readers cannot open. The diff is [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/recommend-by-author-list-never-shown/fix.diff):

```diff
-				{assign var=submission value=$articleBySameAuthor.publishedSubmission}
+				{assign var=submission value=$articleBySameAuthor.submission}
+				{assign var=publication value=$articleBySameAuthor.currentPublication}
 				{assign var=issue value=$articleBySameAuthor.issue}
-				{assign var=journal value=$articleBySameAuthor.journal}
-				{assign var=publication value=$submission->getCurrentPublication()}
+				{assign var=journal value=$articleBySameAuthor.context}
 …
-					<a href="{url … page="issue" op="view" path=$issue->getBestIssueId() …}">
-						{$journal->getLocalizedName()|escape}: {$issue->getIssueIdentification()|escape}
-					</a>
+					{if $issue && $issue->getPublished()}
+						<a href="{url … page="issue" op="view" path=$issue->getBestIssueId() …}">
+							{$journal->getLocalizedName()|escape}: {$issue->getIssueIdentification()|escape}
+						</a>
+					{else}
+						{$journal->getLocalizedName()|escape}
+					{/if}
```

The fix does not undo the rebuild's move off `formatResults()`: the plugin stays on the shared search-result collection and the Laravel paginator, which `{page_links}` already accepts.

The fix was tried on OJS `main`. Steps 6 and 7 then showed exactly the Expected lists, and the server logged nothing. A page whose contributors have no other published article showed no section and logged nothing with the fix in and with it out, and the Search page still listed "Signalling Theory Dividends".

**Alternatives:**

- Add `publishedSubmission` and `journal` keys to `APP\search\SubmissionSearchResult::newCollection()`. That brings old names back into the shared result shape for one plugin's sake, and still leaves the issue assumption.
- Filter articles outside a published issue out in the plugin, as `formatResults()` did. That would hide published articles of journals that publish without issues.

**What goes with it:**

- The guard: an OJS e2e or Cypress check that enables the plugin, gives two published articles a contributor of the same name, and reads the section on both pages. OJS has no test for this plugin today.
- `pkp/ojs#5231` (open, for `pkp/pkp-lib#12141`) rewrites this template's pagination but is written against the 3.5 shape (`publishedSubmission`, `article`). Whichever lands second on `main` needs this change folded in.
- No backport: 3.5, 3.4 and 3.3 build the list with `ArticleSearch::formatResults()`, whose keys the template reads correctly.

Small, because the change is a few lines in one template, follows the Search page's use of the same collection and needs no data repair.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/recommend-by-author-list-never-shown/walk.js) takes Steps 1 to 7 through the screens on an install freshly loaded from the default dataset, and records each screen, the contributor list and publication status from the database, and the server log lines for each article page. Run: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/recommend-by-author-list-never-shown/walk.js`.
- Fix trial: [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/recommend-by-author-list-never-shown/trial.sh) applies fix.diff with `node bin/try-fix.js apply`, walks the Steps and [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/recommend-by-author-list-never-shown/neighbour.js) (the no-match page and the Search page) with the fix, reverts, and walks neighbour.js again without it.
- `main` walked at OJS bade233f73 (2026-09-30), pkp-lib 2e377d27fc (2026-09-30), on PostgreSQL: the walk saw the Observed above on both article pages.
- 3.5 walked at OJS 92b9a16b48 (2026-09-30), pkp-lib a9c76aed62 (2026-09-30): both sections listed as in Expected, with nothing logged. Code read: `RecommendByAuthorPlugin.php` builds the list with `ArticleSearch::formatResults()`, which returns `publishedSubmission`, `article`, `issue` and `journal`, and skips articles outside a published issue.
- 3.4 read in the code at OJS `stable-3_4_0` 9571d8fde7 (2026-09-25), pkp-lib df13621c2d: the same `formatResults()` keys and the same template. 3.3 read at OJS `stable-3_3_0` 9fdb9bcf9a (2026-09-18), pkp-lib d446601ebe: `RecommendByAuthorPlugin.inc.php` and `ArticleSearch.inc.php`, the same. Neither has c7d20e95dd or e38f0f4eff.
- Introduced: `git blame` on `articleFooter.tpl` lines 15 to 18 gives [e98f79fc96](https://github.com/pkp/ojs/commit/e98f79fc96245e18da671134715516f985c6200d) (2025-03-26, `pkp/pkp-lib#10671`) for the `publishedSubmission` and `journal` lines, which were right then, and c7d20e95dd for the move that made them wrong; blame on `RecommendByAuthorPlugin.php` line 159 gives e38f0f4eff. Both were authored on 2025-07-09 and landed on `main` on 2025-08-01, rebased, with `pkp/ojs#4963`, beside `pkp/pkp-lib#11578`, which added the new result shape.
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs and pkp/ui-library issues and pull requests for "recommend author", "recommendByAuthor", "same author", "articleFooter", "publishedSubmission", "getCurrentPublication() on null" and "SubmissionSearchResult". The nearest are `pkp/pkp-lib#12141` with its open `pkp/ojs#5231` (described above), `pkp/pkp-lib#5887` (open: performance) and `pkp/pkp-lib#5683` (closed 2020: an older fatal error). None is this fault.
- Unverified: the issue guard's other branch (a matching article with no issue or an unpublished one) was not walked.
