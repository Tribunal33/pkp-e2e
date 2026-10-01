# Preprint lists and a journal's "Latest Publications" show additional files and link a galley with no file ("404 Not Found")

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS (a home page showing "Latest Publications" without the current issue's table of contents), OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** OPS: [df0ab2a2f5](https://github.com/pkp/ops/commit/df0ab2a2f534b4c3767205d3eda67353d7d8275f) (no pull request) · 2019-09-26 · Antti-Jussi Nygård (ajnyga). OJS: [9486d8e182](https://github.com/pkp/ojs/commit/9486d8e182356a101a018450ea2073c747addbaa) (no pull request found), written for `pkp/pkp-lib#9295` · 2025-05-27 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An article's or preprint's own page offers its main galleys, sets its
additional files (a data set, a research instrument) apart under
"Additional Files", and leaves out a galley that has no file. An
issue's table of contents offers the main galleys only. A preprint
server's lists, and a journal's "Latest Publications" when the home
page does not also show the current issue's table of contents, offer
every galley instead: the additional files as if they were the article
itself, and the galley with no file as a link that answers "404 Not
Found".

A galley has no file when an editor presses "Add galley", saves the
label and then cancels the upload window. A galley at a separate
website is not this case: it has an address, and its link works.

Both symptoms come from one missing filter, and one fix covers both.
Every file stays reachable from the item's own page. On a journal the
list in question, "Latest Publications", exists on `main` only. A
journal with no issue shows it that way with no setting touched; a
journal with issues does once a manager turns it on and takes the
current issue's table of contents off the home page.

## Impact

- **Lost.** No data is lost or damaged. Additional files show in the
  lists as if they were the article. A galley with no file shows as a
  dead link, and nobody on the editorial side is told.
- **Who.** Readers of a preprint server's home page, "Archives" and
  section pages, and of a journal's home page as described above. The
  additional files show for every item that has them. The dead link
  needs an editor to have cancelled a galley's upload window and
  published anyway, which is an ordinary action but an uncommon one to
  leave behind.
- **Way round.** Readers open the item's own page, which lists the
  right files. An editor deletes the galley with no file (on a posted
  preprint, after "Unpost").

Low: every file is still reachable, and the dead link needs a leftover
galley.

## Steps to reproduce

On a preprint server:

Preconditions:

- PKP's default test dataset for OPS `main`: the server
  `publicknowledge`. Preprint 1, "The influence of lactation on the
  quantity and quality of cashmere production", is in Production, not
  posted, with one galley, "PDF".
- Any small file at hand (the walk used a CSV).

Steps:

1. Sign in as `dbarnes` (Preprint Server manager).
2. Open submission 1 and go to Preprint › "Galleys".
3. Press "Add galley", type `Data u13ir19` in "Galley Label" and press
   "Save". In "Upload a File Ready for Publication" choose "Data Set"
   under "Preprint Component", upload the file, then "Continue",
   "Continue", "Complete".
4. Press "Add galley", type `Draft u13ir19` in "Galley Label" and press
   "Save". In "Upload a File Ready for Publication" press "Cancel"
   without choosing a file.
5. Press "Post", then "Post" in the "Post the preprint" window.
6. Sign out, and open the preprint's page
   (`/index.php/publicknowledge/preprint/view/1`).
7. Press "Archives" in the main menu, and find the preprint in the list.
8. Press "Draft u13ir19" in its entry.

**Expected.** Step 6 offers "PDF", with "Data u13ir19" apart as an
additional file, and no "Draft u13ir19". In step 7 the entry offers
"PDF" only, so step 8 cannot be taken.

**Observed.** Step 6 is as expected. In step 7 the entry offers "PDF",
"Data u13ir19" and "Draft u13ir19". Step 8 shows a page reading only:

```
404 Not Found
```

```
GET /index.php/publicknowledge/en/preprint/view/1/22      302
GET /index.php/publicknowledge/en/preprint/download/1/22  404
```

The home page's "Latest preprints" and the "Preprints" section page
(`/index.php/publicknowledge/preprints/section/preprints`) show the same
three links.

On a journal:

Preconditions:

- PKP's default test dataset for OJS `main`: the journal
  `publicknowledge`, whose issue "Vol. 1 No. 2 (2014)" is the current
  issue. Submission 5, "Genetic transformation of forest trees", is in
  Production with no galleys.
- A PDF and any other small file at hand (the walk used a CSV).

Steps:

1. Sign in as `dbarnes` (Journal editor).
2. Go to Settings › Website › Appearance › "Theme". Under "Journal
   Content Organization", tick "Include recent most published articles"
   (the label as the form words it),
   leave "Include the current issue's table of contents" ticked, and
   press "Save".
3. Open submission 5 and go to Publication › "Galleys". Add three
   galleys as in steps 3 and 4 above: `PDF` (component "Article Text",
   the PDF), `Data u13ir19` (component "Data Set", the other file) and
   `Draft u13ir19` ("Save", then "Cancel" in the upload window).
4. Go to Publication › "Title & Abstract" and press "Publish". In
   "Review Publishing Details" pick Publication Stage "Version of
   Record", Revision Significance "Major Revision" and "Don't Assign To
   An Issue", then "Confirm" and "Publish".
5. Sign out, open the journal's home page and read the article's entry
   under "Latest Publications".
6. Sign in as `dbarnes`, go back to "Journal Content Organization",
   untick "Include the current issue's table of contents" and press
   "Save".
7. Sign out, open the home page and read the entry again.
8. Press "Draft u13ir19" in the entry.

**Expected.** Steps 5 and 7 show the same entry, offering "PDF" only.

**Observed.** In step 5 the home page shows "Latest Publications" and,
below it, "Current Issue". The entry offers "PDF". In step 7 the home
page shows "Latest Publications" alone, and the entry offers "PDF",
"Data u13ir19" and "Draft u13ir19". Step 8 shows "404 Not Found"
(`/index.php/publicknowledge/en/article/download/5/6` answers 404). The
article's own page offers "PDF", and "Data u13ir19" as an additional
file, throughout.

Control: article 17 in the current issue's table of contents offers
"PDF" in every step where the issue is shown.

A journal that has no issue at all shows "Latest Publications" alone
without steps 2 and 6: with the theme's "Journal Content Organization"
never saved, that is its default. This route was read in the code
(Cause), not walked; the dataset's journal has two issues.

## Cause

The list entry is `article_summary.tpl` on a journal and
`preprint_summary.tpl` on a preprint server. Both narrow the galleys
only when the page handed them `$primaryGenreIds`, the list of main
file types
([`article_summary.tpl`](https://github.com/pkp/ojs/blob/bade233f73/templates/frontend/objects/article_summary.tpl#L86-L93),
[`preprint_summary.tpl`](https://github.com/pkp/ops/blob/c8af945bb7/templates/frontend/objects/preprint_summary.tpl#L105-L112)):

```smarty
{foreach from=$publication->getData('galleys') item=galley}
	{if $primaryGenreIds}
		{assign var="file" value=$galley->getFile()}
		{if !$galley->getData('urlRemote') && !($file && in_array($file->getGenreId(), $primaryGenreIds))}
			{continue}
		{/if}
	{/if}
```

That one test drops both a galley with no file and a galley whose file
is an additional one. It came with `pkp/pkp-lib#2577`, which moved
supplementary files out of the table of contents. Both templates
document `$primaryGenreIds` as an input (`@uses`). When it is empty or
not assigned, every galley is linked.

Only `IssueHandler::setupIssueTemplate()` assigns it. Four handlers
show the summary with its galleys and never do:

- OPS `IndexHandler::index()` ("Latest preprints"),
  `PreprintsHandler::index()` ("Archives") and
  `SectionsHandler::section()`. OPS has no issue handler, so no preprint
  list ever narrowed its galleys: "Archives" since df0ab2a2f5
  (2019-09-26), "Latest preprints" since 5c0f887e6e (2020-02-04).
- OJS `IndexHandler::index()`, for "Latest Publications", which
  9486d8e182 added for `pkp/pkp-lib#9295`.

On OJS the list is filtered only by accident. When the home page also
shows the current issue, `setupIssueTemplate()` has assigned
`primaryGenreIds` for the table of contents, and `latest_article.tpl`
picks it up. Otherwise nothing assigns it. That happens in two ways:

- A journal with no issue at all, with no setting touched.
  `IndexHandler::index()` falls back to `JournalContentOption::default()`
  whenever the theme's `journalContentOrganization` was never saved, and
  for a journal with no issue the default is `[RECENT_PUBLISHED]` alone
  (code; not walked).
- A journal with issues, once a manager ticks "Include recent most
  published articles" and either unticks "Include the current issue's
  table of contents" (walked) or has no current issue (code).

The link of a galley with no file leads to `view`, which redirects to
`download`. There `ArticleHandler::download()` and
`PreprintHandler::download()` find no `submissionFileId` and throw
`NotFoundHttpException`. The item's own page is right because
`ArticleHandler::view()` and `PreprintHandler::view()` sort the galleys
themselves: main ones, additional ones, and neither for a galley with
no file and no remote address.

Reach:

- Category pages and search results pass `hideGalleys=true` on both
  apps, so they list no galleys (code).
- OJS's issue page and the home page's "Current Issue" get
  `primaryGenreIds` from `setupIssueTemplate()` (on screen).
- OJS up to 3.5 has no "Latest Publications"; its only list with
  galleys is the table of contents (3.5 on screen, 3.4 and 3.3 code).
- OMP has no galleys, and its book summary links no files (code).
- The filter does not run on a context with no enabled main file type:
  the list is empty, `{if $primaryGenreIds}` is false, and every galley
  shows, in the table of contents too (code).
- A theme or plugin page that includes a summary without assigning the
  list shows every galley as well (code; none read).

## Proposed fix

Two changes, which do different jobs, so both are recommended. The
diffs to apply are
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/listing-offers-galley-without-file/fix-ojs.diff)
and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/listing-offers-galley-without-file/fix-ops.diff).

1. **In the two summary templates, always skip a galley with neither a
   file nor a remote address.** This removes the dead link for every
   caller, whatever `$primaryGenreIds` holds: the four handlers, a
   context with no main file type, a theme or plugin page. It changes
   nothing else on screen and needs no decision.

   ```diff
    {foreach from=$publication->getData('galleys') item=galley}
   +	{* A galley with neither a file nor a remote address has nothing to open *}
   +	{assign var="file" value=$galley->getFile()}
   +	{if !$galley->getData('urlRemote') && !$file}
   +		{continue}
   +	{/if}
    	{if $primaryGenreIds}
   -		{assign var="file" value=$galley->getFile()}
   -		{if !$galley->getData('urlRemote') && !($file && in_array($file->getGenreId(), $primaryGenreIds))}
   +		{if !$galley->getData('urlRemote') && !in_array($file->getGenreId(), $primaryGenreIds)}
    			{continue}
   ```

2. **In the four handlers, assign `primaryGenreIds`**, as
   `IssueHandler::setupIssueTemplate()` does. This takes the additional
   files out of the lists, which the template skip alone does not. In
   OJS `pages/index/IndexHandler.php`, inside the `RECENT_PUBLISHED`
   block:

   ```diff
   +use PKP\submission\GenreDAO;
    …
   +                // The summaries list only the main galleys, as an issue's table of contents does
   +                $genreDao = DAORegistry::getDAO('GenreDAO'); /** @var GenreDAO $genreDao */
   +                $primaryGenres = $genreDao->getPrimaryByContextId($journal->getId())->toArray();
   +                $primaryGenreIds = array_map(fn ($genre) => $genre->getId(), $primaryGenres);
   +                $templateMgr->assign('primaryGenreIds', $primaryGenreIds);
   ```

   The OPS diff adds the same three lines and a `'primaryGenreIds' =>
   $primaryGenreIds` entry to `IndexHandler::index()`,
   `PreprintsHandler::index()` and `SectionsHandler::section()`. It adds
   `use PKP\submission\GenreDAO;` to all three, and `use
   PKP\db\DAORegistry;` to `PreprintsHandler` and `SectionsHandler`,
   which do not import it today.

The handler change on OPS is a visible change the team decides before
that part of the OPS diff is applied: additional files have been in
every preprint server's lists since OPS began, and they would move to
the preprint's page alone. The template skip and the OJS diff do not
depend on that decision; "Latest Publications" is unreleased, and with
the fix it matches the table of contents beside it.

How this was settled:

- **Where the rule lives.** "Nothing to open, no link" belongs to the
  template that writes the link, so no caller can get it wrong. Which
  file types count as main is per context, and the templates take it as
  an input from the handler.
- **How the code base already does it.** Part 2 copies
  `setupIssueTemplate()`. Part 1 is the test `ArticleHandler::view()`
  and `PreprintHandler::view()` make for the item's page.
- **Every instance.** The Cause's list of handlers and its Reach cover
  every include of the two summaries in the three apps.
- **What it touches.** No API, hook or stored data. A galley at a
  separate website stays listed. Part 1 adds one `getFile()` per listed
  galley where the filter did not run before.
- **The guard.** The U13 spec's list scenarios, extended with a galley
  with no file and an additional file, on a posted preprint and on an
  article in "Latest Publications".

Tried on `main`, both parts together, each app with its diff. On OPS,
"Archives", "Latest preprints" and the section page offered "PDF" for
preprint 1, and no "Draft u13ir19" to press. On OJS, "Latest
Publications" offered "PDF" with and without the current issue on the
page. Three things the fix must not change were read with the fix
applied and without it, and were the same both times: a galley at a
separate website stayed in every list; the items' own pages read "PDF"
with "Data u13ir19" as an additional file; preprint 2 and article 17
(in the issue's table of contents) still offered "PDF". Part 1 was not
tried on its own.

**Alternatives**

- Part 1 alone: it is the fix to take on OPS if the team wants a
  preprint server's lists to keep the additional files.
- Part 2 alone: it leaves the dead link wherever the list is empty or
  not assigned (Cause, reach).
- Refuse to publish or post while a galley has no file. That closes the
  source, and needs a product decision: existing published items would
  keep theirs.
- Have the templates work the main file types out themselves. It puts a
  database read in a template that is included once per entry.

**What goes with it**

- Backport: the OPS handler hunks do not apply as written to
  `stable-3_5_0` (the `use` lines and the `assign()` context differ);
  the same lines go in by hand. 3.4 and 3.3 have the same three
  handlers and the same template test, written with
  `$galley->getRemoteUrl()` (and `.inc.php` handlers on 3.3). OJS needs
  no backport.

Medium: each change is small and follows code that exists, but they
land in two app repositories separately, and the OPS handler part
waits on a decision.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/listing-offers-galley-without-file/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/listing-offers-galley-without-file/walk.js)
  takes both sets of Steps. Run it on an install freshly loaded from the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/listing-offers-galley-without-file/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). For the fix
  check, apply `fix-ojs.diff` to the OJS root and `fix-ops.diff` to the
  OPS root first.
- Where the walk differs from the Steps: the script adds a fourth
  galley, "Remote u13ir19" ("This galley will be available at a separate
  website." ticked, address `https://example.org/u13ir19`). It is the
  case next to the finding that the fix must leave alone: no file, but
  an address, so it must stay listed.
- [`reach.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/listing-offers-galley-without-file/reach.js)
  beside it is the check of what the fix must not change. Signed out,
  on the state the walk leaves, it reads every list, the item's own page
  and another item's entry.
- Walked on `main` (OJS, OPS) and `stable-3_5_0` (OPS), on PostgreSQL,
  from pkp/datasets 38ab955 (2026-09-30). OPS 3.5 gave the same result
  as `main`. On OJS 3.5 the script found no "Journal Content
  Organization" on the theme form and no "Latest Publications" on the
  home page. No request failed apart from the 404 in Observed, and no
  script error showed.
- "(code)" in Affects and in the Cause marks what was read in the code
  and not run. On 3.4 and 3.3 that was OPS's `preprint_summary.tpl`, the
  templates that include it, every assignment of `primaryGenreIds` and
  `PreprintHandler::download()`; and on OJS the templates that include
  `article_summary.tpl`.
- Tips: OJS `main` bade233f73, its `lib/pkp` 2e377d27fc. OPS `main`
  c8af945bb7, its `lib/pkp` 3dc90c81a6. OJS `stable-3_5_0` 92b9a16b48,
  OPS `stable-3_5_0` cf4fce69bd, their `lib/pkp` a9c76aed62. OPS
  `stable-3_4_0` acd8ae704b, `stable-3_3_0` c5532e2161. OJS
  `stable-3_4_0` 9571d8fde7, `stable-3_3_0` 9fdb9bcf9a.
- Introduced: `git log -S` on the include of the summary and on
  `filterByLatestPublished` and `setupIssueTemplate` in the two
  `IndexHandler`s. OPS a022e5950f (2019-06-03) took the issue's table of
  contents off the home page; df0ab2a2f5 added "Archives" with the
  summary, 5c0f887e6e the home page's list. GitHub shows no pull request
  for these commits or for OJS 9486d8e182. The test in the templates is
  8895277831 (2017-08-18, `pkp/pkp-lib#2577`).
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ops issues and PRs, by symptom
  words (galley without a file, 404, supplementary galleys in a list,
  "Latest Publications") and by `primaryGenreIds` and
  `preprint_summary`. Read and not this fault: `pkp/pkp-lib#2577` (the
  change that introduced the test), `pkp/pkp-lib#3007` (remote and
  supplementary galleys missing from the article page, closed).
- Not driven: a journal with no issue (Cause); the fix on
  `stable-3_5_0` (a dry run of the first version of the OPS diff only);
  part 1 of the fix without part 2.
- Unverified: third-party themes and plugins that include or override
  the summary templates; none were read.
