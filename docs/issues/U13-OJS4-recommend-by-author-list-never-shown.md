# With "Recommend Articles by Author" on, article pages never show "Most read articles by the same author(s)"

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ojs#4963` for `pkp/pkp-lib#8920` · [c7d20e95dd](https://github.com/pkp/ojs/commit/c7d20e95dde04487c9cf0dce7905d542523e55bb) · 2025-07-09 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [OJS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

With "Recommend Articles by Author" on (it is off on a new journal),
the page of an article whose contributor has another published article
in the journal opens normally, but without "Most read articles by the
same author(s)".

The app fails on the server as it builds that list: the plugin's error
is caught and logged, and the page is served without the list.

## Impact

- **Lost.** The list that leads readers from an article to the same
  author's other articles in the journal. Nobody is told; the error is
  only in the server log.
- **Who.** Every visitor, signed in or not, on every article whose
  contributor has another published article in the journal, in a
  journal with the plugin on.
- **Way round.** None. The plugin has no settings, and the list has no
  other place on screen.

Medium: an optional list under the article is missing on every page it
should show on, silently, while the article itself is complete. It
would be high if the plugin were on by default.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`: journal `publicknowledge`,
  whose issue "Vol. 1 No. 2 (2014)" is published.
- The dataset has two published articles, 1 "Signalling Theory
  Dividends" and 17 "Antimicrobial, heavy metal resistance and plasmid
  profile of coliforms isolated from nosocomial infections in a hospital
  in Isfahan, Iran" (contributor Vajiheh Karbasizaed), and no two
  published articles share a contributor. Steps 2 to 4 publish a second
  article by Vajiheh Karbasizaed.

Steps:

1. Sign in as `rvaca` (Journal manager). Settings › Website ›
   "Plugins": tick "Recommend Articles by Author". Sign out.
2. Sign in as `dbarnes`. Open submission 5, "Genetic transformation of
   forest trees" (Production).
3. Publication › "Contributors" › "Add Contributor": Given Name
   "Vajiheh", Family Name "Karbasizaed", Email "u13ir4@mailinator.com",
   Country "Canada", tick "Author" under Contributor Roles, "Save".
4. "Schedule For Publication": Publication Stage "Version of Record",
   Revision Significance "Major Revision", "Assign To Current/Back
   Issue", Issue "Vol. 1 No. 2 (2014)", "Confirm", then "Publish". Sign
   out. [3.5: Publication › "Issue" › "Assign to Issue", pick "Vol. 1
   No. 2 (2014)", "Save"; then "Schedule For Publication" and
   "Publish".]
5. Signed out, open article 17's page
   (`/index.php/publicknowledge/article/view/17`).
6. Open article 5's page (`/index.php/publicknowledge/article/view/5`).

**Expected.** Under article 17, "Most read articles by the same
author(s)" lists "Diaga Diouf, Vajiheh Karbasizaed, Genetic
transformation of forest trees, Journal of Public Knowledge: Vol. 1
No. 2 (2014)". Under article 5, the same heading lists article 17.

**Observed.** Both pages answer 200 and show the article in full, with
no "Most read articles by the same author(s)" anywhere on the page.
The server logs, for each of the two pages:

```
Plugin APP\plugins\generic\recommendByAuthor\RecommendByAuthorPlugin failed to handle the hook Templates::Article::Footer::PageFooter
Error: Call to a member function getCurrentPublication() on null in …/cache/t_compile/…articleFooter.tpl.php:38
#11 …/plugins/generic/recommendByAuthor/RecommendByAuthorPlugin.php(162): PKP\template\PKPTemplateManager->fetch()
```

The same steps on 3.5 show the list on both pages, as expected. Article
1, whose contributors have no other article, shows no list and logs
nothing on either version.

## Cause

`plugins/generic/recommendByAuthor/templates/articleFooter.tpl` reads
each item of the list as `$articleBySameAuthor.publishedSubmission` and
`$articleBySameAuthor.journal`, and then calls
`$submission->getCurrentPublication()` (line 18). Those are the keys of
`ArticleSearch::formatResults()`, which the search rebuild removed
(Laravel Scout, `pkp/pkp-lib#8920`, in OJS through `pkp/ojs#4963`).

`RecommendByAuthorPlugin::callbackTemplateArticlePageFooter()` now
builds the list with `APP\search\SubmissionSearchResult::newCollection()`
(line 159). Its items carry `submission`, `currentPublication`,
`context` and `section` (pkp-lib `PKP\search\SubmissionSearchResult`),
plus `issue` and `issueAvailable` (the OJS subclass). So `$submission`
is null and the template throws on the first item. `Hook::run()`
catches the error, logs it through
`PluginFailureHandler::logIfPluginFailure()`, and the page is served
without the plugin's output. The plugin's own search for the same
author's articles works: with no match the loop never runs, which is
why article 1 logs nothing.

[c7d20e95dd](https://github.com/pkp/ojs/commit/c7d20e95dde04487c9cf0dce7905d542523e55bb)
("Adapt articles by same author plugin for ArticleSearch removal")
moved the plugin to the new collection and the template from
`{iterate}` to `{foreach}`, but kept the old item keys. In the same pull
request,
[e38f0f4eff](https://github.com/pkp/ojs/commit/e38f0f4effc244311bbafe9c029d0025aa2716f1)
moved the search page to `$result.submission` and `$result.context`;
this template was not moved.

Reach:

- Article pages with the plugin on: every article whose contributor
  shares a name with another published article's contributor (walked,
  articles 5 and 17).
- The other readers of these items already use the new keys and are
  not affected (code). Scout's `Builder::paginate()` calls
  `newCollection()` for the search results page
  (`templates/frontend/pages/search.tpl`, `$result.submission`,
  `$result.context`) and for the category browse page
  (`templates/frontend/pages/catalogCategory.tpl` line 74,
  `$result.submission`), both through `SubmissionSearchResult::builderFromRequest()`.
  No other template reads `publishedSubmission` or `journal` from a
  search result. OMP and OPS do not ship this plugin.
- A second fault waits behind the first: the template links the issue
  with `$issue->getBestIssueId()`, unguarded. On `main` an article can
  be published with "Don't Assign To An Issue", and its `issue` is null,
  so with only the keys corrected the list would fail again on such an
  article (code; the fix below guards it, walked).
- Stored data: none.

## Proposed fix

Read the items by the keys the collection carries, as the search page
does, and show the issue link only when there is an issue, as the
"Recommend Similar Articles" template does. One template in OJS
([`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/recommend-by-author-list-never-shown/fix.diff)):

```diff
--- a/plugins/generic/recommendByAuthor/templates/articleFooter.tpl
+++ b/plugins/generic/recommendByAuthor/templates/articleFooter.tpl
@@ -12,20 +12,21 @@
 		<h2>{translate key="plugins.generic.recommendByAuthor.heading"}</h2>
 		<ul>
 			{foreach from=$articlesBySameAuthor item=articleBySameAuthor}
-				{assign var=submission value=$articleBySameAuthor.publishedSubmission}
+				{assign var=submission value=$articleBySameAuthor.submission}
+				{assign var=publication value=$articleBySameAuthor.currentPublication}
 				{assign var=issue value=$articleBySameAuthor.issue}
-				{assign var=journal value=$articleBySameAuthor.journal}
-				{assign var=publication value=$submission->getCurrentPublication()}
+				{assign var=journal value=$articleBySameAuthor.context}
 				<li>
 					{foreach from=$publication->getData('authors') item=author}
 						{$author->getFullName()|escape},
 					{/foreach}
 					<a href="{url router=PKP\core\PKPApplication::ROUTE_PAGE journal=$journal->getPath() page="article" op="view" path=$submission->getBestId() urlLocaleForPage=""}">
 						{$publication->getLocalizedFullTitle(null, 'html')|strip_unsafe_html}
-					</a>,
+					</a>{if $issue},
 					<a href="{url router=PKP\core\PKPApplication::ROUTE_PAGE journal=$journal->getPath() page="issue" op="view" path=$issue->getBestIssueId() urlLocaleForPage=""}">
 						{$journal->getLocalizedName()|escape}: {$issue->getIssueIdentification()|escape}
 					</a>
+					{/if}
 				</li>
 			{/foreach}
 		</ul>
```

Tried on `main`: with the fix, the Steps show the Expected list on both
pages and the server logs nothing. A wider check ran with the fix in
and out. It added the same contributor to submission 6, published with
"Don't Assign To An Issue", and to submission 9, left unpublished.
With the fix, article 17 lists articles 5 and 6 (6 without an issue
link) and never 9, and article 1 still lists nothing. Without it, no
page shows a list.

**Alternatives**

- Map the items back to the old keys in the plugin's PHP. The search
  and category pages have dropped those keys, so this plugin alone
  would keep the old shape alive. It would not help themes either:
  their copies of the old template already broke when c7d20e95dd
  replaced `{iterate}` with `{foreach}`.
- Guard a null `$submission` in the template. The page would stop
  logging, but the list would still never show.

**What goes with it**

- A theme that overrides `articleFooter.tpl` (themes can since
  `pkp/pkp-lib#3781`) needs the same change; worth a line in the
  release notes.
- `pkp/pkp-lib#12141` reworks this template's pagination, with PR
  `pkp/ojs#5231` open on `stable-3_5_0`; a forward-port of it to `main`
  will conflict with this change.
- Test: an e2e scenario in U13, an article page with the plugin on and
  two published articles by one contributor, one of them outside an
  issue.

A proposal. Small: one template, tried.

## Evidence

- Kept script, which takes the Steps through the screens on an install
  freshly loaded from PKP's default test dataset (pkp/datasets 38ab955,
  the `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/recommend-by-author-list-never-shown/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/recommend-by-author-list-never-shown/walk.js),
  with its helpers in `lib.js` beside it, run with
  `PROBE_FEATURE=issues-ir4 PROBE_AGENT=ir4 node bin/probe.js ojs shared/playwright/checks/issues/recommend-by-author-list-never-shown/walk.js`.
  It records each article page's status, the list's items and links,
  and the lines the server logged during the walk. With `neighbour` as
  its argument it adds the wider check of the Proposed fix.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/recommend-by-author-list-never-shown/fix.diff ojs`,
  then `walk.js` and `walk.js neighbour`, each on a freshly loaded
  install; `walk.js neighbour` also ran without the fix. Reverted with
  `node bin/try-fix.js revert`.
- Tips: OJS `main` bade233f73 (2026-09-30) with pkp-lib 2e377d27fc;
  OJS `stable-3_5_0` 92b9a16b48 (2026-09-30) with pkp-lib a9c76aed62;
  `stable-3_4_0` 9571d8fde7 (2026-09-25); `stable-3_3_0` 9fdb9bcf9a
  (2026-09-18).
- 3.5 (walked, and read): the same script on the `stable-3_5_0`
  install, with the publish step taken through 3.5's "Issue" page; both
  pages showed the list. There the plugin builds the list with
  `ArticleSearch::formatResults()`, whose items carry
  `publishedSubmission`, `article`, `issue` and `journal`, the keys its
  template reads.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0`
  `plugins/generic/recommendByAuthor/RecommendByAuthorPlugin.php` and
  `upstream/stable-3_3_0` `RecommendByAuthorPlugin.inc.php` use
  `ArticleSearch::formatResults()` and a `VirtualArrayIterator`; the
  templates read the keys that `classes/search/ArticleSearch.php` (3.4)
  and `ArticleSearch.inc.php` (3.3) set.
- Introduced: `git blame` on the template's line 15 and the plugin's
  line 159, then `git show` of the two commits it names and of
  e38f0f4eff's `search.tpl` change; `commits/<sha>/pulls` gives
  `pkp/ojs#4963`, merged 2025-08-01.
- Upstream search (2026-10-01), issues and pull requests, open and
  closed, in pkp/pkp-lib, pkp/ojs and pkp/ui-library, for terms such as
  "recommend by author", "recommendByAuthor" and "publishedSubmission".
  Nearest: `pkp/pkp-lib#12141`
  (open, pagination of the two recommendation plugins on 3.5),
  `pkp/pkp-lib#5887` (open, the plugin's performance) and
  `pkp/pkp-lib#5683` (closed 2020, a different fatal error in
  `formatResults()`); none is this fault.
- Not driven: OMP and OPS (no such plugin); MySQL (the fault does not
  depend on the database). Unverified: the null-issue failure without
  the guard was read in the code, not walked with a keys-only fix.
