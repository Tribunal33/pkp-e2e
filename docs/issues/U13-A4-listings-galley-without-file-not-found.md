# Preprint lists and a journal's "Latest Publications" list additional files, and a galley without a file as a dead link

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** OJS: `pkp/ojs#4875` for `pkp/pkp-lib#9295` · [9486d8e182](https://github.com/pkp/ojs/commit/9486d8e182356a101a018450ea2073c747addbaa) · 2025-05-27 · Touhidur Rahman (touhidurabir); OPS: not traced; present since at least [11f39599b0](https://github.com/pkp/ops/commit/11f39599b0dd11630a64e543fcf4d8fe12e2b82a) (2019-09-08)
- **Upstream** none found (2026-10-01)
- **Tracked in** U13 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A preprint server's lists ("Latest preprints" on the home page, "Archives" and each section's list) show every galley of a preprint, additional files such as a "Data Set" included, next to the main "PDF". A journal's "Latest Publications" does the same when the home page does not also show the current issue's table of contents. The article's or preprint's own page and the issue's table of contents list only the main galleys and show the additional files apart.

The same lists also link a galley that has no file, and that link opens the "404 Not Found" page. A galley has no file when an editor presses "Add galley" and leaves the upload window without uploading: "Add galley" saves the galley before the upload starts. The article's page and the issue's table of contents leave such a galley out.

On a journal, "Latest Publications" shows without the current issue when the theme's "Journal Content Organization" ticks "Include recent most published articles" but not "Include the current issue's table of contents". A journal with no issues gets that setting by default. The journal half is on `main` only and has not shipped in a release; the preprint server half has been there since 2019.

## Impact

- **Lost**: nothing stored. Readers meet a dead "404 Not Found" link, and the list offers data sets and other additional files as if they were the article's full text.
- **Who**: every visitor of the lists named in the Summary. The dead link shows only once an editor or moderator leaves a galley without a file; the additional files show on every article or preprint that has one.
- **Way round**: the article's or preprint's own page lists the right files. An editor can delete the galley without a file, but nothing tells them it is linked.

Low: no reader loses a file, and the dead link needs a galley left without a file. It would be medium if the lists were a reader's only way to the files.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS and OPS `main` (OPS also `stable-3_5_0`).
- Two small files on disk, here `u13a4.pdf` (any PDF) and `u13a4-data.csv` (any CSV).

Journal (OJS):

1. Sign in as `dbarnes`. Open submission 5, "Genetic transformation of forest trees" (Production).
2. Under "Galleys", press "Add galley", type the label "PDF", "Save"; in the upload window choose "Article Text", add `u13a4.pdf`, "Continue", "Continue", "Complete".
3. "Add galley" again: label "Data", "Save"; choose "Data Set", add `u13a4-data.csv`, "Continue", "Continue", "Complete".
4. "Add galley" again: label "Draft", "Save"; in the upload window press "Cancel" before choosing a file. The galley list reads "PDF", "Data", "Draft".
5. Press "Schedule For Publication". Under "Publication Stage" choose "Version of Record (VoR)", under "Revision Significance" "Major Revision", under "Issue Assignment" "Don't Assign To An Issue"; "Confirm", then "Publish".
6. Settings › Website › Appearance › Theme: under "Journal Content Organization" tick "Include recent most published articles" (leave "Include the current issue's table of contents" ticked), "Save".
7. Sign out and open the journal's home page. Read the article's links under "Latest Publications".
8. Sign in as `dbarnes` again, untick "Include the current issue's table of contents" on the same tab, "Save". Sign out.
9. Open the home page. Read the article's links under "Latest Publications" and press "Draft".
10. Open the article's page from its title.

Preprint server (OPS):

1. Sign in as `dbarnes`. Open submission 1, "The influence of lactation on the quantity and quality of cashmere production" (Production, not posted; it has a galley "PDF").
2. Under "Galleys", "Add galley": label "Data", "Save"; choose "Data Set", add `u13a4-data.csv`, "Continue", "Continue", "Complete".
3. "Add galley": label "Draft", "Save"; press "Cancel" in the upload window before choosing a file.
4. Press "Post", then "Post" in the confirmation.
5. Sign out and open the server's home page. Read the preprint's links under "Latest preprints" and press "Draft".
6. Open the archive, `/index.php/publicknowledge/preprints` ("Archives"). Read the preprint's links.
7. Open the preprint's page from its title.

**Expected**: every list shows the article's or preprint's main galley only, "PDF", as the issue's table of contents and the article's page do. "Data" is listed on the article's page as an additional file; "Draft", which has no file, is listed nowhere.

**Observed**: in step 7 of the journal steps, with the current issue also shown, "Latest Publications" lists "PDF" only. In step 9, without it, the same list shows "PDF", "Data" and "Draft". On the server, "Latest preprints" and "Archives" show "PDF", "Data" and "Draft" (`main` and 3.5 alike). "Draft" leads to the "404 Not Found" page on both apps:

```
GET /index.php/publicknowledge/en/article/view/5/6      302 → /index.php/publicknowledge/en/article/download/5/6
GET /index.php/publicknowledge/en/article/download/5/6  404 Not Found
```

(on the server, `preprint/view/1/22`, then `preprint/download/1/22`, 404.) The article's and the preprint's pages list "PDF" under the downloads and "Data" apart, as an additional file, and no "Draft".

## Cause

The summary templates that every list uses decide which galleys to show, but only when the page gives them the context's main ("primary") genres. OJS `templates/frontend/objects/article_summary.tpl` and OPS `templates/frontend/objects/preprint_summary.tpl` loop over the current publication's galleys and skip one that is neither remote nor a file of a primary genre, which drops a galley without a file and an additional file alike, inside `{if $primaryGenreIds}`. Without that variable, every galley is linked. This filter came with `pkp/pkp-lib#2577` (2017, "Only show primary galleys in article summary"), when the issue's table of contents was the summary's only list.

Only OJS's `IssueHandler::setupIssueTemplate()` assigns `primaryGenreIds`: for the issue's page, and for the home page when it shows the current issue's table of contents. Both apps' other lists never assign it:

- OJS `IndexHandler::index()`, "Latest Publications" (`JournalContentOption::RECENT_PUBLISHED`, `latest_article.tpl`), added by 9486d8e182 for continuous publication (`pkp/pkp-lib#9295`). It reuses `article_summary.tpl` without the variable, so it filters only when the `ISSUE_TOC` code below it happens to run `setupIssueTemplate()` on the same page.
- OPS `IndexHandler::index()` ("Latest preprints", `indexServer.tpl`), `PreprintsHandler::index()` ("Archives", `preprints.tpl`) and `SectionsHandler::section()` (a section's list, `sections.tpl`).

OPS copied the filter when it forked from OJS. Its 1eb6077563 (2019) removed the issue pages, the only ones that assigned the variable, so none of its lists ever had one.

Kind is defect for both halves: neither list ever filtered its galleys, so no change broke something that worked. OJS's "Latest Publications" is new on `main` (unreleased) and was wrong from its first commit; OPS's lists have been wrong since the fork.

A galley without a file comes from "Add galley": its form saves the galley, then opens the upload window, and leaving that window without a file keeps the galley. The app treats this as a state it can hold: the article's and preprint's pages (`ArticleHandler::view()`, `PreprintHandler::view()`) sort the galleys in the handler and drop one with neither a file nor a remote URL, and the issue's table of contents drops it through the filter. In the lists its link goes through `view` to `download`, which finds no `submissionFileId` and answers `NotFoundHttpException`.

Reach:

- Search results and category pages pass `hideGalleys=true` and list no galleys (code; OJS's search checked on screen).
- OMP's book summaries list no publication formats (code).

## Proposed fix

Each handler that renders a list with galleys passes the main genres, as `IssueHandler::setupIssueTemplate()`, `ArticleHandler::view()` and `PreprintHandler::view()` already compute them: `GenreDAO::getPrimaryByContextId()` mapped to ids. That is OJS `IndexHandler::index()` where it handles `RECENT_PUBLISHED`, and OPS `IndexHandler::index()`, `PreprintsHandler::index()` and `SectionsHandler::section()`. In OJS:

```diff
 use PKP\security\Validation;
+use PKP\submission\GenreDAO;
@@
                     $itemsPerPage,
                     $rangeInfo->page
                 ));
+
+                // List only the main galleys, as the issue's table of contents does
+                $genreDao = DAORegistry::getDAO('GenreDAO'); /** @var GenreDAO $genreDao */
+                $primaryGenres = $genreDao->getPrimaryByContextId($journal->getId())->toArray();
+                $templateMgr->assign('primaryGenreIds', array_map(fn ($genre) => $genre->getId(), $primaryGenres));
             }
```

The OPS handlers do the same with their own context: `$server` in `IndexHandler`, `$context` in `PreprintsHandler`, `$contextId` in `SectionsHandler`. `PreprintsHandler` and `SectionsHandler` also need `use PKP\db\DAORegistry;`, and in `IndexHandler` and `PreprintsHandler` the value goes into the existing `assign([...])` array. The exact lines are in [fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/listings-galley-without-file-not-found/fix-ojs.diff) and [fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/listings-galley-without-file-not-found/fix-ops.diff).

Tried on `main`: with the fix, the Steps show the Expected on both apps, including the section's list. The pages around it were read with the fix in and out and stayed the same: the issue's table of contents, the other preprints' "PDF" in the lists, the article's and preprint's pages, the "Data" download, and search results without galleys.

**Alternatives**:

- Skip a galley with neither a file nor a remote URL in the templates, outside `{if $primaryGenreIds}`. One line per app, but it only removes the dead link and leaves the additional files in the lists.
- Assign `primaryGenreIds` for every frontend page in the app's `TemplateManager`. One place per app, but it adds a genre query to every page that never shows a galley.
- Make "Add galley" save the galley only once its file is uploaded, or warn when the upload window closes empty. That changes the shared galley workflow, and it neither clears galleys already stored without a file nor removes the additional files from the lists. It can follow the list fix, not replace it.

**What goes with it**:

- No stored data changes; no API or hook changes. A theme that overrides the summary templates gets the variable it already expects.
- Backport: OPS 3.5 and 3.4 have the same three handlers. 3.3 has `IndexHandler.inc.php`, `PreprintsHandler.inc.php` and `SectionsHandler.inc.php`, with `getPrimaryByContextId()` in its `GenreDAO`. OJS needs the fix on `main` only.
- Left out: a context with no enabled primary genre still gets every galley, since the templates test the array for emptiness. That setup leaves no galley for the article's page's main list either.
- Guard: an e2e check in U13 that "Latest Publications" without the current issue, and OPS's "Latest preprints", "Archives" and section list, show only the main galleys. It should use a galley without a file and an additional file.

Medium: a few lines each in four handlers across two app repos, following the pattern `IssueHandler` uses, with an e2e check.

## Evidence

- Kept walk: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/listings-galley-without-file-not-found/walk.js), on an install freshly loaded from the default dataset: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/listings-galley-without-file-not-found/walk.js` (3.5: `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front; OJS is skipped there). `PHASE=neighbour` in front, after a walk, reads the pages the fix must leave alone, and the section's list.
- Fix tried: [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/listings-galley-without-file-not-found/trial.sh) applies `fix-ojs.diff` and `fix-ops.diff` (`node bin/try-fix.js apply … ojs|ops`), walks the Steps and `PHASE=neighbour` with the fix, reverts, and runs `PHASE=neighbour` again without it.
- Tips walked or read: OJS `main` [bade233f73](https://github.com/pkp/ojs/commit/bade233f73) (pkp-lib [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc)), 3.5 [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48), 3.4 [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7), 3.3 [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9a). OPS `main` [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb7) (pkp-lib [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a6)), 3.5 [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd) (pkp-lib [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed62)), 3.4 [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b), 3.3 [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161). Dataset: pkp/datasets 38ab955 (2026-09-30), PostgreSQL; the fault does not depend on the database.
- 3.5 (OPS walked, and code): `preprint_summary.tpl` has the same `{if $primaryGenreIds}` filter, and none of `IndexHandler`, `PreprintsHandler` or `SectionsHandler` assigns it. OJS 3.5 (code): `IndexHandler::index()` only calls `IssueHandler::_setupIssueTemplate()`, and 9486d8e182 is not on `stable-3_5_0`.
- 3.4 and 3.3 (code): OPS `templates/frontend/objects/preprint_summary.tpl` on `upstream/stable-3_4_0` and `upstream/stable-3_3_0` holds the same filter. No file under `pages/` or `classes/` assigns `primaryGenreIds` except `PreprintHandler` (git grep). `PreprintHandler::download()` answers `handle404()` when the galley has no file. OJS 3.4 and 3.3 include `article_summary.tpl` only from `issue_toc.tpl` and, with `hideGalleys=true`, from search and category pages.
- Introduced: 9486d8e182 ("content organization options with front update") added `latest_article.tpl`, which includes `article_summary.tpl`, and the `RECENT_PUBLISHED` branch of `IndexHandler::index()`. `pkp/ojs#4875` was closed on GitHub without a merge, but its change reached `main` rebased: its commit 2f2bd44d70 is 9486d8e182 there. Later changes to that `RECENT_PUBLISHED` code in `IndexHandler::index()` (d6c8937035, pagination; `filterByLatestPublished`) kept the missing variable. The template filter is 8895277831 (`pkp/pkp-lib#2577`, 2017); 68adc75613 (`pkp/pkp-lib#1816`) only wrapped it in `{if !$hideGalleys}`. OPS's 11f39599b0 (2019-09-08) renamed the summary to `preprint_summary.tpl` with the filter kept.
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/ops and pkp/ui-library, issues and PRs, by the symptom's words ("galley 404", "latest publications galley", "supplementary galleys", "galley no file") and by `primaryGenreIds`. `pkp/ojs#1499` and `pkp/pkp-lib#3007` concern the article page's supplementary galleys (closed, fixed), and `pkp/pkp-lib#12226` the remote galley's upload window; none is this fault.
