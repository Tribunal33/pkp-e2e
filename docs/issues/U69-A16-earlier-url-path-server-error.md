# A book's earlier URL Path, or an issue address with an unknown galley, shows a blank server error page

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OMP, OJS (an issue's address with a galley the issue lacks)
  - 3.5: OMP (OJS 3.5 already has the fix)
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** a pkp/pkp-lib commit without a PR · [bee9547b49](https://github.com/pkp/pkp-lib/commit/bee9547b491353e92e53e5ed2da2d197a24be972) · 2024-06-26 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U69 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a16); spec U50 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a14)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The server fails when a reader opens a book's address with a URL Path
the book used before. After a later version of the book is published
with a new URL Path, the address with the old one shows a blank server
error page instead of forwarding to the book's current address.

Old bookmarks, shared links and search engines' links to the book
break, and the press can bring them back only by giving up the new URL
Path.

The address with the new URL Path fails the same way while the version
that holds it is still unpublished; it should forward to the published
version's address, which keeps working throughout. On a journal, an
issue's address that names a galley the issue does not have shows the
same blank page instead of the issue.

## Impact

- **Lost.** Every visit through the old address: a blank page with no
  link onward, and nobody at the press is told. The same for a visit
  through the address of an issue galley that is gone.
- **Who.** Readers of a press that changed a published book's URL Path
  on a later version, and readers of a journal that removed or renamed
  an issue galley. Neither is an everyday action. Before the new
  version is published, the one who meets it is the editor who tries
  the new address early.
- **Way round.** The reader can find the book through the catalog, or
  the issue through the archive. The press can restore the old address
  only by saving the old URL Path on a new version.

Medium: the book's current address keeps working and nothing stored is
lost, but old links to it fail for every reader, in a state few presses
reach. It would be high if the book's current address failed too.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OMP `main`, freshly loaded. Submission
  14, "From Bricks to Brains: The Embodied Cognitive Science of LEGO
  Robots", is published in one version, "Version of Record 1.0", and has
  no URL Path, as no book in the dataset has.
- The journal step uses PKP's default test dataset for OJS `main` as it
  is: issue 1, "Vol. 1 No. 2 (2014)", is published and has no issue
  galleys.

A book's earlier URL Path:

1. Sign in as `dbarnes` (Press editor).
2. Open submission 14's workflow,
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=14`.
3. In the workflow's side menu, under "Publication", press "Create New
   Version". In the "Create New Version" window press "Confirm" without
   changing anything. [3.5: the "Create New Version" button above the
   publication's pages, then "Yes".]
4. On the new version, open "Catalog Entry", type `u69r2-first` in "URL
   Path" and press "Save".
5. Press "Publish", then "Publish" in the window that asks "Are you sure
   you want to make this catalog entry public?".
6. Repeat step 3.
7. On that version, open "Catalog Entry", replace the "URL Path" with
   `u69r2-second` and press "Save".
8. In another browser, signed out, open
   `/index.php/publicknowledge/catalog/book/u69r2-second`.
9. Back as `dbarnes`, repeat step 5 on the new version.
10. Signed out, open
    `/index.php/publicknowledge/catalog/book/u69r2-first`.

An issue's address with an unknown galley (OJS):

11. Signed out, open `/index.php/publicknowledge/issue/view/1/999`.

**Expected:** step 10 lands on `…/en/catalog/book/u69r2-second`, the
book's page. Step 8 lands on `…/en/catalog/book/u69r2-first`, the page
of the published version. Step 11 lands on `…/en/issue/view/1`, the
issue's page.

**Observed:** steps 8, 10 and 11 each answer 500 with a blank page (no
title, no text). Step 8 answers the same to `dbarnes`. [3.5: step 11
lands on the issue's page.] The server log:

```
302 …/catalog/book/u69r2-first
500 …/en/catalog/book/u69r2-first

PHP Fatal error:  Uncaught TypeError: PKP\core\PKPRequest::redirect(): Argument #4 ($path) must be of type ?array, string given, called in …/pages/catalog/CatalogBookHandler.php on line 132 and defined in …/lib/pkp/classes/core/PKPRequest.php:718
```

After step 9, `…/catalog/book/u69r2-second` and `…/catalog/book/14` open
the book's page. `…/catalog/book/u69r2-first/version/19` opens the older
version under "This is an outdated version published on …"; 19 is the
ID of the version made in step 3 on a freshly loaded dataset.

## Cause

Up to 3.4 a page address's path could be handed over as a single value:
`PKPRequest::redirect()` was untyped and documented "string or array",
and `PKPPageRouter::url()` wrapped a string into a list. Three pkp-lib
commits of the 3.5 cycle made the path a list everywhere:

- [bee9547b49](https://github.com/pkp/pkp-lib/commit/bee9547b491353e92e53e5ed2da2d197a24be972)
  ("Self-documentation; clean up router delegation", 2024-06-26)
  declared `?array $path` on `PKPRequest::redirect()` and
  `PKPRequest::url()` (`classes/core/PKPRequest.php` lines 718 and 773).
- [d9f093ea68](https://github.com/pkp/pkp-lib/commit/d9f093ea68d3ddab0b7eea554c989b9f078258a8)
  ("Clean up URL construction and array handling", 2024-06-28) declared
  it on `PKPPageRouter::url()` and removed the wrapping there.
- [5189e06cce](https://github.com/pkp/pkp-lib/commit/5189e06ccea6fcad8bc8f9b4d2009de5f89bc9d8)
  ("Standardize url path to ?array", 2024-07-05) declared it on
  `Dispatcher::url()`.

Callers that still pass a single value were not changed with them. Two
of them go through `redirect()`, whose own type is the first to refuse
the value, so each throws a `TypeError` before any redirect is sent.
`redirect()`'s docblock still reads "string or array".

`CatalogBookHandler::book()` (omp `pages/catalog/CatalogBookHandler.php`
lines 126–133) is the first. A URL Path resolves to its book through any
of the book's versions (`Repo::submission()->getByUrlPath()`), and the
handler then compares it with the URL Path of the book's current
version. When they differ it is meant to forward ("If the publication
has been reached through an outdated urlPath, redirect to the latest
version"), but it passes the current URL Path as a string.

An unpublished newer version takes the same branch. The book's current
version stays the last published one until the new one is published,
for a signed-in editor as for a visitor, so the new version's URL Path
finds the book and differs from the current one.

When the current version has no URL Path, the same lines pass
`$this->publication->getId()`. That value is a publication (version)
ID, while the address reads a number as a book's ID, so it has named
the wrong thing since the lines were written (pkp/omp
[fde7f3c8b1](https://github.com/pkp/omp/commit/fde7f3c8b1b12209049c48776840eb6982f47ffa),
`pkp/pkp-lib#5430`, 2020-02-17). Today it throws like the string does.

`IssueHandler::initialize()` (ojs `pages/issue/IssueHandler.php` line
82) is the second: for a galley the issue does not have it calls
`redirect(null, null, 'view', $issue->getId())`.

Reach:

- A book whose current version has no URL Path, opened by an earlier
  version's URL Path: 500 on `main` and 3.5, the log reading "int
  given" (walked, in the extra version made after step 10).
- OJS 3.5 passes `[$issue->getId()]` since pkp/ojs
  [ed58cee7e8](https://github.com/pkp/ojs/commit/ed58cee7e8e6410bc792d9162e83a6ee37dbdab6)
  (2025-04-09), a commit on `stable-3_5_0` that `main` does not have
  (walked).
- 3.4 and 3.3: both callers forward (code). With no current URL Path
  the book's forward goes to `…/catalog/book/{version ID}`, which is
  another book's address or none (code, not walked).
- Every other `->redirect(` call with a path, in the three apps, their
  pkp-lib and their plugins, passes a list (code). OPS's
  `PreprintHandler::initialize()` forwards with a list it builds from
  the address's remaining parts.
- The `->url(` calls on the request, the dispatcher and the routers
  were read the same way (code). Two pass a single value and are not
  covered by this report's fix; neither was walked:
  - `AnnouncementNotificationManager::getNotificationUrl()` (pkp-lib
    `classes/notification/managerDelegate/AnnouncementNotificationManager.php`
    line 69, `main` and 3.5) passes the announcement's ID to
    `Dispatcher::url()`. `PKPNotificationManager::getNotificationUrl()`
    builds the same address itself with a list (line 83), and the
    announcement job calls only the delegate's `notify()`; no screen
    that reaches the delegate's own method was found.
  - `HtmlGalleyHelper::handleOmpUrl()` (omp
    `plugins/generic/htmlMonographFile/classes/HtmlGalleyHelper.php`
    line 162, `main`) passes `$urlParts[1]` to `PKPRequest::url()` for
    an `omp://monograph/…` link inside an HTML book file. OJS's
    `htmlArticleGalley` twin passes `[$urlParts[1]]`.
- The Smarty `{url}` function wraps a single value into a list itself
  (`PKPTemplateManager::smartyUrl()`), so templates are not affected.

## Proposed fix

Recommended: pass a list in both callers, and correct `redirect()`'s
docblock
([fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/earlier-url-path-server-error/fix-omp.diff),
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/earlier-url-path-server-error/fix-ojs.diff);
each carries the same pkp-lib docblock line).

```php
// omp pages/catalog/CatalogBookHandler.php, book()
if (!ctype_digit((string) $submissionId) && $submissionId !== $this->publication->getData('urlPath') && !$subPath) {
    $request->redirect(null, $request->getRequestedPage(), $request->getRequestedOp(), [$submission->getBestId()]);
}

// ojs pages/issue/IssueHandler.php, initialize()
$request->redirect(null, null, 'view', [$issue->getId()]);

// lib/pkp classes/core/PKPRequest.php, redirect()
 * @param $path Path info for the redirect, one list item per path segment.
```

`$submission->getBestId()` is the current version's URL Path, or the
book's ID when it has none, which also corrects the version ID the old
fallback sent. OJS's `ArticleHandler::initialize()` builds its forward
from `getBestId()` too, and the OJS line is the one `stable-3_5_0`
already has.

Tried on `main`: steps 8, 10 and 11 landed on the Expected pages, and a
book whose current version has no URL Path landed on
`…/catalog/book/14` from its earlier one. Neighbour checks, the same
with the fix in and out: the current URL Path and the number address
open the book and keep their address; an older version under the old
URL Path opens that version; an unknown URL Path and an unknown issue
send a visitor to Login; another book's number opens that book.

Left out: the two `url()` callers named in the Cause's reach. The same
one-line change (`[$value]`) applies to each; neither was tried, since
no screen was found that reaches the first and the second needs an HTML
book file with an `omp://monograph/` link.

**Alternatives:**

- Accepting a single value again in one place. Widening `redirect()`
  alone would only move the `TypeError` one call down, to
  `Dispatcher::url()`: either `redirect()` wraps the value into a list
  itself before passing it on, or three signatures widen
  (`redirect()`, `Dispatcher::url()`, `PKPPageRouter::url()`) and the
  router wraps again. Both undo what the three commits were for, and
  both leave the version ID in the book's fallback.
- Wrapping only the existing value in the book handler
  (`[$newArgs]`) stops the error but still forwards a book without a
  current URL Path to a version's ID.

**What goes with it:**

- Backport: the OMP change applies as written to `stable-3_5_0`; OJS
  needs it on `main` only. On 3.4 and 3.3 only the fallback's wrong ID
  would be worth it.
- The guard: an e2e scenario in U69 (a book with a URL Path changed on
  a later version, opened by the earlier one) and in U50 (an issue's
  address with an unknown galley).

Small: one line in each of two handlers and a docblock line, following
the pattern their siblings use, with no data repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/earlier-url-path-server-error/walk.js)
  takes the Steps on OMP and OJS, on an install freshly loaded from the
  default dataset, then the controls, the neighbour checks and one more
  version with the URL Path cleared:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/earlier-url-path-server-error/walk.js`.
  The fix was tried with `node bin/try-fix.js apply …/fix-omp.diff omp`
  and `… apply …/fix-ojs.diff ojs`, the same script, then `revert`.
- Where the walk differed from the Steps: it opens "Catalog Entry" by
  the workflow address the menu entry leads to, and takes step 8 in a
  second browser while `dbarnes` stays signed in.
- Walked on `main` and `stable-3_5_0` (OMP and OJS), PostgreSQL; nothing
  here depends on the database. Datasets: pkp/datasets fetched at
  92050d9 (2026-10-01).
- Tips: OMP `main` 3b0ecf794 (lib/pkp 3dc90c81a6), OJS `main` 4408b94def
  (lib/pkp f5bd392a69); OMP `stable-3_5_0` b24879c3d (lib/pkp
  1fb843f491), OJS `stable-3_5_0` 18d097d94e; OMP `stable-3_4_0`
  0aec65441 (lib/pkp df13621c2d); OMP `stable-3_3_0` 8e72fc883 (lib/pkp
  d446601ebe).
- Code reads beyond the Cause: `CatalogBookHandler::book()` on 3.4 and
  3.3 (`CatalogBookHandler.inc.php`) has the same forward;
  `PKPPageRouter::url()` on 3.4 turns a string path into a one-item
  list; `PKPSubmission::getBestId()`. The caller sweep read every
  `->redirect(` and `->url(` call whose path argument is not a list
  literal or `null`, in the three apps' own code, pkp-lib and plugins
  (tests and vendored code left out).
- Introduced: bee9547b49 is the commit whose type the log names; it has
  no PR on GitHub and its first tag is `3_5_0-0`. d9f093ea68 belongs to
  `pkp/pkp-lib#10147` ("Coding standards"). Neither is on
  `stable-3_4_0`. The callers' lines are older: the book's from 2020,
  the issue's from 2013.
- Upstream search 2026-10-01, pkp/pkp-lib, pkp/omp and pkp/ojs, by
  "urlPath redirect", "catalog book url path error old", "outdated
  urlPath", "issue galley redirect 500", "must be of type ?array",
  "PKPRequest redirect TypeError", "CatalogBookHandler",
  "IssueHandler redirect": nothing about this fault.
- Not driven: the two `url()` callers left out of the fix; a journal
  whose issue galley was removed after its address was shared (the
  Steps use a galley number the issue never had, which takes the same
  line).
