# One view of an HTML galley counts once more for each picture or style sheet it names that was never uploaded

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** no PR (pushed straight to `main`, in the same push as the commit for `pkp/pkp-lib#12752`) · [03833b261f](https://github.com/pkp/ojs/commit/03833b261fd4d4cdb0bc9b96e238e69266ed4108) · 2026-07-13 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U64 [OJS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U64-usage-statistics.md#ojs2)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a journal, a reader opens an HTML galley whose file names, by a
relative address, a picture or a style sheet that was never uploaded
with it. The browser asks for each missing file, and each request is
answered with the galley's own HTML and recorded as another view of
the galley. For a galley naming two missing files, once the day is
processed, Statistics › "Articles" reads "HTML" 3 for the one view,
and "Download Files" lists the HTML file with 3. Expected: 1.

The extra views stay because they come in the same second as the
view: the daily processing merges a repeat view only when it comes 1
to 29 seconds later. A slower load that spreads the requests over
two or three seconds reads 2 or 1.

The reader sees the same page either way, the text without the
picture. Uploading each file the HTML names as a dependent file of the
galley is the way round; views already counted stay counted.

## Impact

- **Lost.** Correct usage figures: the article's HTML views, file
  views and total, and its COUNTER R5 "Total_Item_Requests" and
  "Total_Item_Investigations", gain one view per missing file when the
  requests come in the same second, as they did in every walk. The
  unique COUNTER figures stay right. Nothing on screen shows the excess.
- **Who.** Journals that publish HTML galleys whose files name a
  picture, a style sheet or a script by a relative address
  (`figure.png`, `images/figure.png`) without uploading it beside
  them. A file on another host, or named from the site's root
  (`/…`) or a folder up (`../…`), is not affected. Only OJS `main`
  has the fault, in no release yet; the next release from `main`
  carries it unless it is fixed.
- **Way round.** Upload every file the HTML names as a dependent file
  of the galley: an uploaded file is served as itself and adds no
  view. No screen removes the excess already counted, and it grows
  with every view.

Medium: the usage statistics a journal reports to its funders and to
libraries are wrong, silently, for the articles whose HTML galleys
name missing files. It would be high if most HTML galleys named a
missing file.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`;
  the "HTML Article Galley" plugin is on there).
- A file `article.html` that names a style sheet `article.css` and a
  picture `figure.png`, neither of which is uploaded in the steps:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Signalling Theory Dividends</title>
<link rel="stylesheet" href="article.css">
</head>
<body>
<h1>Signalling Theory Dividends</h1>
<p>The full text of the article, with one figure.</p>
<img src="figure.png" alt="Figure 1">
</body>
</html>
```

Steps:

1. Sign in as `dbarnes`.
2. Open submission 1, "Signalling Theory Dividends". The workflow opens
   on its unpublished version 1.1; open that version's "Galleys".
3. Press "Add galley", type "HTML" as the Galley Label and press
   "Save". In "Upload a File Ready for Publication" choose "Article
   Text", upload `article.html`, press "Continue", "Continue",
   "Complete".
4. Press "Publish" for version 1.1. In "Review Publishing Details" keep
   what it preselects and press "Confirm", then "Publish". [3.5:
   "Publish", then the window's own "Publish".]
5. Sign out. Open the article's page
   (`/index.php/publicknowledge/article/view/mwandenga`; `mwandenga` is
   the article's URL Path in the dataset) and press "HTML". The
   article's text shows, without the picture.
6. Let the day be processed. The daily "Usage statistics file loader
   task" turns the previous day's visits into figures, and the
   Statistics pages end their ranges at yesterday. To see it the same
   day, move today's log to yesterday and run the task and the job
   queue from the app's root:

   ```sh
   cd <files_dir>/usageStats        # files_dir as in config.inc.php
   mkdir -p stage
   today=$(date +%Y%m%d)
   sed -E "s/\"time\":\"$(date +%F) /\"time\":\"$(date -d yesterday +%F) /" usageEventLogs/usage_events_$today.log > stage/usage_events_$today.log
   rm usageEventLogs/usage_events_$today.log

   cd <the app's root>
   php lib/pkp/tools/scheduler.php test '--name=APP\tasks\UsageStatsLoader'
   php lib/pkp/tools/jobs.php work --stop-when-empty
   ```

7. Sign in as `dbarnes` and open Statistics › "Articles". Read the
   "HTML" column of the article's row ("The The Signalling Theory
   Dividends Version 2: A Review Of The Literature And Empirical
   Evidence", the dataset's own title for version 1.1, "The The"
   included). The other columns can hold more: the dataset's files
   carry the usage log of the day the dump was built, which the task
   processes too.
8. Press "Download Report", then "Download Files", and open the file.

**Expected.** The frame's requests for `article.css` and `figure.png`
answer "404 Not Found". The article's row reads "HTML" 1, and the
file's line for `article.html` reads 1.

**Observed.** The two missing files' addresses answer the galley's own
file, and the day's usage log gets three lines for it, all in the same
second:

```
GET /index.php/publicknowledge/en/article/download/mwandenga/4/46?inline=1   200 text/html   (the galley's file, in the frame)
GET /index.php/publicknowledge/en/article/download/mwandenga/4/article.css   200 text/html   (the galley's file again)
GET /index.php/publicknowledge/en/article/download/mwandenga/4/figure.png    200 text/html   (the galley's file again)

usage_events_<today>.log, three times:
{"time":"2026-10-15 10:16:21", "assocType":515, "submissionId":1, "representationId":4, "submissionFileId":46,
 "canonicalUrl":".../index.php/publicknowledge/article/download/1/4/46", ...}
```

After step 6 the article's row reads "HTML" 3, and "Download Files"
holds:

```
1,"The The Signalling Theory Dividends Version 2",46,article.html,"Primary File",3
```

No error shows and the server logs none. The three lines came in the
same second in every walk; had the two extra requests come a second
or more after the view, the processing would have dropped the earlier
lines and the row would read 2 or 1.

With `figure.png` uploaded under "Dependent Files" in step 3, the
picture's address answers the picture (200 `image/png`) and only the
missing `article.css` adds a view: two lines for the one view.

## Cause

The galley page shows the galley's file in a frame at
`article/download/{article}/{galley}/{file ID}`.
`HtmlGalleyHelper::getHTMLContents()` rewrites the file's references to
uploaded dependent and media files into their own download addresses.
A reference to a file that was never uploaded stays as written, so the
browser resolves `article.css` against the frame's address and asks
for `article/download/mwandenga/4/article.css`.

`ArticleHandler::initialize()` reads that last segment as the file ID
with a cast
([`pages/article/ArticleHandler.php` line 187](https://github.com/pkp/ojs/blob/378eced94154d9367f9a6fd02a7fc363400f7f6b/pages/article/ArticleHandler.php#L187)):

```php
$this->submissionFileId = (int) array_shift($args);
```

`(int) 'article.css'` is 0. `download()` takes 0 as "no file asked for"
and substitutes the galley's own file (`if (!$this->submissionFileId)
$this->submissionFileId = $this->galley->getData('submissionFileId')`).
The HTML Article Galley plugin's `ArticleHandler::download` hook then
serves the galley's HTML and fires a `UsageEvent` for the galley file.
So every segment that is not a number becomes one more view of the
galley, with the same canonical URL as the real one.

Before 03833b261f the segment stayed a string. `download()` compared it
with the galley's file ID and its dependent files' IDs, found no match
and answered 404, as 3.5 does. 17bed669e9 (`pkp/ojs#5308`, for
`pkp/pkp-lib#12245`) declared the property `?int`, so assigning a
non-numeric string threw a `TypeError`; 03833b261f ("Resolve typed
property warning (string to int conversion)") added the cast to stop
it, which turned every such segment into the galley's own file.

The daily processing does not merge the extra lines, though COUNTER
counts requests by one user for one item within 30 seconds as one:
`PKPTemporaryTotalsDAO::removeDoubleClicks()` removes an earlier line
only when the later one comes more than 0 seconds after it
(`EXTRACT(EPOCH FROM (ustt.date - ust.date)) > 0`;
[line 104](https://github.com/pkp/pkp-lib/blob/b17fadae59156c99746754a740caf75b753e0aa1/classes/statistics/PKPTemporaryTotalsDAO.php#L104)),
and the three lines come in the same second. Lines a second or more
apart are merged, so only the lines in the same second as the last one
survive: 3 when all three share a second, 2 or 1 when the load is
slower. The `> 0` is a separate, older fault, from the 3.4 statistics
rewrite (pkp-lib 86acb07, `pkp/pkp-lib#6782`) and in 3.4 and 3.5 too:
any two requests for one file by one reader in the same second count
twice there. Only on `main` does a single view produce such repeats.

Reach:

- Every HTML galley on `main` whose file names, by a relative address
  without `/` or `../` in front, a file that was not uploaded
  (pictures, style sheets, scripts, fonts, other pages): one more view
  per missing file whose request lands in the same second as the
  view's last request (seen in the walk). An address on another host,
  from the site's root or a folder up never reaches this handler with
  a file segment: the first two go elsewhere, and `../figure.png`
  becomes the galley segment, which matches no galley and answers 404
  (code).
- The versioned address of an older version's galley
  (`article/download/{article}/version/{publication}/{galley}/…`) goes
  through the same lines (code).
- The COUNTER daily figures the R5 reports are built from
  (`metrics_counter_submission_daily`, read after step 6): 3 requests
  and 4 investigations for the walk's day against 1 and 2 with the fix;
  the unique requests (1) and unique investigations (2) are the same
  both ways, since they count one per reader session.
- The missing file's request gets the article's HTML in place of a
  style sheet or a picture. The browser discards it, and the page
  shows the text without the picture, as 3.5 does with its 404 (seen
  in the walk).
- OPS keeps the segment as a string in
  `PreprintHandler::initialize()` and answers 404; its HTML galley also
  downloads rather than showing in a frame. OMP's
  `CatalogBookHandler::download()` answers 404 for these addresses
  (code).
- No other `(int) array_shift($args)` in OJS's page handlers stands for
  an ID that `0` turns into a default.

## Proposed fix

A proposal, tried on main:
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/html-galley-missing-file-counts-view/fix.diff),
applied to OJS. With it the Steps give what Expected says: both
addresses answer 404, the day's log has one line, the row reads "HTML"
1, the file line 1, and the day's COUNTER requests 1. A dependent
file's picture, the galley's own file and the article's PDF galley
answer the same with the patch as without it.

Recommended: in `ArticleHandler::initialize()`, take a file ID only
when the segment is a number and answer 404 otherwise, as the method
already does for the article's own segment (`ctype_digit((string)
$urlPath)`):

```diff
             if (!empty($args)) {
-                $this->submissionFileId = (int) array_shift($args);
+                $submissionFileId = (string) array_shift($args);
+                if (!ctype_digit($submissionFileId)) {
+                    throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException();
+                }
+                $this->submissionFileId = (int) $submissionFileId;
             }
```

It keeps what 03833b261f was for, an `int` in the typed property with
no `TypeError`, and restores the 404 that 3.5 gives. The check sits
where the address is read, so `view()`, `download()` and every
`ArticleHandler::download` hook (HTML Article Galley, Lens, Usage
Event) see a real file ID or nothing.

**Alternatives:**

- Revert 03833b261f. The string comes back, and so does the
  `TypeError` on the typed property: a server error instead of a 404.
- Rewrite missing references in `HtmlGalleyHelper` (drop them, or
  point them nowhere). It changes the galley's HTML, covers only the
  HTML plugin, and leaves any other non-numeric address serving the
  galley.
- Make `removeDoubleClicks()` merge same-second repeats (`>= 0`)
  instead. It would hide this in the processed figures, but the
  missing files would still get the article's HTML and the log would
  still record views.

**What goes with it:**

- The check also runs for `view`: `article/view/{article}/{galley}/{anything
  not a number}` answers 404 where it now shows the galley page (3.5
  shows it too). Nothing the app builds uses such an address: the
  galley links (`galley_link.tpl`), the sitemap, and the DataCite,
  Crossref and DOAJ exports build view addresses that end at the
  galley or the version (code).
- No data repair and no backport (Affects).
- A test: a request for `article/download/{article}/{galley}/missing.css`
  answers 404 and writes no usage line, beside one for a dependent
  file's numeric address that still answers the file.
- Separately, `removeDoubleClicks()`'s `> 0` wants `>= 0` (the Cause),
  in its own change.

Small: four lines in one method, following the pattern a few lines
above it, and a test.

## Evidence

- Kept script, which takes the Steps through the screens on an install
  freshly loaded from PKP's default test dataset (pkp/datasets 7912e09,
  2026-10-14, the `main` and `stable-3_5_0` PostgreSQL dumps):
  [`shared/playwright/checks/issues/html-galley-missing-file-counts-view/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/html-galley-missing-file-counts-view/walk.js),
  with `lib.js`, `article.html` and `figure.png` beside it (the folder
  stands alone). Run it with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/html-galley-missing-file-counts-view/walk.js`;
  `MODE=nb` runs the neighbour check. The fix was tried by applying
  `fix.diff` to the OJS checkout (`node bin/try-fix.js apply … ojs`)
  and running the script and its neighbour mode, then the neighbour
  mode again without it. The neighbour check uploads `figure.png` as a
  dependent file in step 3 and opens the "PDF Version 2" galley after
  step 5: with the fix and without, the picture answered 200
  `image/png`, the galley's file 200 and the PDF 200
  `application/pdf`. Without the fix, the still-missing `article.css`
  gave a second line in the same second; with it, 404 and one line.
- Where the walk differs from the Steps: the reader's browser named
  itself as an ordinary desktop Chrome, since 3.5's list of robots
  holds the test browser's own name. Step 6 moved every log in
  `usageEventLogs` one day back, the dump's own log of the day pkp's CI
  built it included; on `main` that log adds the build's visits (PDF 2,
  abstract views 4) to the row, and on 3.5 the loader drops them as a
  robot's. The "HTML" column and the `article.html` line hold only the
  step 5 view.
- Branch tips: OJS `main` 378eced941 (2026-10-14), lib/pkp b17fadae59;
  OJS `stable-3_5_0` ca763c91cd (2026-10-14), lib/pkp 4045d9241e; OJS
  `stable-3_4_0` daf0ca971d (2026-10-09), lib/pkp 55c8e406b3; OJS
  `stable-3_3_0` d7d9dd14ec (2026-10-09), lib/pkp 5e84acd11b. The
  installs run PostgreSQL; the fault does not depend on the database
  (`removeDoubleClicks()`'s MySQL branch has the same `> 0`).
- 3.5 (walked, and read): the same Steps. `article.css` and
  `figure.png` answered 404, the day's log had one line, the row read
  "HTML" 1 and the file line 1. `ArticleHandler::initialize()` there
  stores the segment uncast (`$this->submissionFileId =
  array_shift($args)`, untyped property) and `download()` answers 404
  when it is neither the galley's file nor a dependent file.
- 3.4 (code): `upstream/stable-3_4_0:pages/article/ArticleHandler.php`
  stores the segment uncast and `download()` answers 404 the same way;
  OJS 3.4 needs PHP 8, where `'article.css' != 46`.
- 3.3 (code): `upstream/stable-3_3_0:pages/article/ArticleHandler.inc.php`
  keeps `$this->fileId` as the string and `download()` calls
  `handle404()` when it is not among the dependent files' IDs.
- OMP and OPS (code, `main`): OPS `PreprintHandler::initialize()` line
  163 stores the segment uncast; OMP `CatalogBookHandler::download()`
  throws `NotFoundHttpException` for a file it cannot find. The spec's
  probe of 2026-10-05 saw OMP answer the two addresses 404 and OPS's
  HTML galley download.
- Introduced: `git blame` on line 187 gives 03833b261f (2026-07-13,
  "Resolve typed property warning (string to int conversion)"), whose
  only change is the `(int)`. GitHub lists no PR for it or for the
  commit after it (04ff2f998c, `pkp/pkp-lib#12752`); both sit on
  `main`'s first-parent line. The typed `?int $submissionFileId` came
  with 17bed669e9 (authored 2026-02-05; PR `pkp/ojs#5308`, merged 2026-02-19 by GitHub's record); between the
  two, these addresses would have thrown a `TypeError` (not walked).
  `removeDoubleClicks()`'s `> 0` is in pkp-lib 86acb07 (2021-07-16,
  Bozana Bokan) and unchanged since.
- Upstream search (2026-10-15), issues and PRs, open and closed, in
  pkp/pkp-lib, pkp/ojs and pkp/ui-library, by the symptom's words
  (HTML galley views counted, missing image or style sheet, statistics
  inflated) and by `removeDoubleClicks`, `ArticleHandler` and
  `submissionFileId`: none found. `pkp/pkp-lib#9636` (query builder for
  `removeDoubleClicks()`) and `pkp/pkp-lib#9627` (its performance) are
  about the same query, not this fault.
- Unverified: the COUNTER R5 reports were not downloaded; the excess
  was read in `metrics_counter_submission_daily`. A slower load (2 or
  1) was not walked, every walk's lines sharing a second; it is read
  from `removeDoubleClicks()`. Addresses on another host, from the
  root or a folder up were read in the code, not walked. MySQL not
  walked.
