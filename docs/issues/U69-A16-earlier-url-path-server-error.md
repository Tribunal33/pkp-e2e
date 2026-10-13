# Old book URL Paths and unknown issue galleys show a blank error page; HTML book files linking another book lose links and figures

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OMP (a book's old URL Path and its HTML files), OJS (an issue's address with a galley the issue lacks)
  - 3.5: OMP (a book's old URL Path and its HTML files; OJS 3.5 already has the fix)
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** a pkp/pkp-lib commit without a PR · [bee9547b49](https://github.com/pkp/pkp-lib/commit/bee9547b491353e92e53e5ed2da2d197a24be972) · 2024-06-26 · Alec Smecher (asmecher), for all three symptoms
- **Upstream** none found (2026-10-01; for the HTML file's links, 2026-10-13)
- **Tracked in** spec U69 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a16); spec U69 [A25](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a25); spec U50 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a14)
- **Checked** 2026-10-01, and 2026-10-13 for the HTML file's links, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-13: U69 A25 joined: the same fault makes a book's HTML file that links another book show as uploaded, its links, figures and placeholders unresolved.

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

On a press, the app is meant to prepare a book's HTML file before a
reader sees it: turn its "omp://…" shorthand links into the press's
real addresses, point its embedded figures at their uploaded files and
fill in placeholders such as "{$pressTitle}". When the file links
another book ("omp://monograph/…"), the page opens normally but the
app skips all of that. The reader gets the file as uploaded: no
"omp://" link in it leads anywhere, its figures do not load and the
placeholders show raw. The server logs an error each time; no error
reaches the reader.

## Impact

- **Lost.** Every visit through the old address: a blank page with no
  link onward, and nobody at the press is told. The same for a visit
  through the address of an issue galley that is gone. A book's HTML
  file that links another book loses its press links, its figures and
  its filled-in placeholders for every reader.
- **Who.** Readers of a press that changed a published book's URL Path
  on a later version, and readers of a journal that removed or renamed
  an issue galley. Neither is an everyday action. Before the new
  version is published, the one who meets it is the editor who tries
  the new address early. The HTML file's readers meet it on every
  visit, but only at presses whose HTML files link another book this way.
- **Way round.** The reader can find the book through the catalog, or
  the issue through the archive. The press can restore the old address
  only by saving the old URL Path on a new version. The press can
  write the HTML file's link to the other book as a full address, and
  the file is then prepared as it should be.

Medium: the book's current address keeps working and nothing stored is
lost, but old links to it fail for every reader, in a state few presses
reach. The HTML file's text still reads, but without its figures and
working links, and only in files that link another book. It would be
high if the book's current address failed too, or if every HTML file
lost its figures.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OMP `main`, freshly loaded. Submission
  14, "From Bricks to Brains: The Embodied Cognitive Science of LEGO
  Robots", is published in one version, "Version of Record 1.0", and has
  no URL Path, as no book in the dataset has.
- The journal step uses PKP's default test dataset for OJS `main` as it
  is: issue 1, "Vol. 1 No. 2 (2014)", is published and has no issue
  galleys.
- The HTML file's steps start again from the OMP dataset, freshly
  loaded: published book 5, "Bomb Canada and Other Unkind Remarks in
  the American Media", and "HTML Monograph File" on, as the dataset has
  it. The dataset has no HTML book file, so steps 12 to 17 add one,
  [`u69h13n-links.html`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/html-file-omp-links-dead/u69h13n-links.html),
  with the figure it embeds,
  [`u69h13n-figure.png`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/html-file-omp-links-dead/u69h13n-figure.png)
  (any PNG serves). Its body holds the lines below. The attributes must
  be in double quotes: the app rewrites only `omp://` addresses written
  that way.

  ```html
  <p>See also <a id="book" href="omp://monograph/14">the other book</a> and <a id="press" href="omp://press">the press</a>.</p>
  <p><img id="figure" src="u69h13n-figure.png" alt="Figure 1"></p>
  <p id="placeholder">Published by {$pressTitle}.</p>
  ```

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

A book's HTML file that links another book (OMP):

12. Sign in as `dbarnes` and open the workflow of "Bomb Canada and
    Other Unkind Remarks in the American Media" by its address,
    `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=5`.
    Press "Publication Formats" in the side menu.
13. Press "Add publication format", type the name "HTML u69h13n" and
    press "OK".
14. In the row "HTML u69h13n" press "Change File". Choose the component
    "Appendix", upload `u69h13n-links.html` and press "Continue". Under
    "Dependent Files" press "Upload File", choose the component
    "Image", upload `u69h13n-figure.png` and press "Continue",
    "Continue" and "Complete". Back in the first window press
    "Continue" and "Complete".
15. In the row of `u69h13n-links.html` press "Set Terms", choose "Open
    Access" and press "Save".
16. In the format's row press "Awaiting Approval", then "OK".
17. In the same row press "Not Available", then "OK". Sign out.
18. Open the press's "Catalog", `/index.php/publicknowledge/en/catalog`,
    and "Bomb Canada and Other Unkind Remarks in the American Media".
19. Press "HTML u69h13n".
20. Look at the figure and the last line, and inspect the address of
    each link in the file.
21. Press "the other book".

**Expected:** step 10 lands on `…/en/catalog/book/u69r2-second`, the
book's page. Step 8 lands on `…/en/catalog/book/u69r2-first`, the page
of the published version. Step 11 lands on `…/en/issue/view/1`, the
issue's page. At step 20 the red figure shows, the last line reads
"Published by Public Knowledge Press.", "the other book" points to
`…/index.php/publicknowledge/en/catalog/book/14` and "the press" to
`…/index.php/publicknowledge/en`. Step 21 opens the page of "From
Bricks to Brains: The Embodied Cognitive Science of LEGO Robots" inside
the frame that holds the file.

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

Step 19 opens the page "HTML u69h13n view of the file
u69h13n-links.html", and the file answers 200. At step 20 the figure
does not load (it asks for `u69h13n-figure.png` beside the file's own
address), the last line reads "Published by {$pressTitle}.", and the
links point to `omp://monograph/14` and `omp://press`, as written. Step
21 changes nothing on the page, opens no tab and raises no error in the
browser. Each opening of the file logs [3.5, walked with the two links
alone: the same links and log, naming the plugin's
`HtmlMonographFilePlugin.php` on line 264]:

```
Plugin generic/htmlMonographFile failed to handle the hook CatalogBookHandler::download
TypeError: PKP\core\PKPRequest::url(): Argument #4 ($path) must be of type ?array, string given, called in …/plugins/generic/htmlMonographFile/classes/HtmlGalleyHelper.php on line 159 and defined in …/lib/pkp/classes/core/PKPRequest.php:771
```

Control: on the same install, steps 12 to 21 again (signed in as
`dbarnes` at step 12), with a format "HTML u69h13n press" and a file
whose only link is `omp://press`, with the same placeholder line and no
figure
([`u69h13n-press.html`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/html-file-omp-links-dead/u69h13n-press.html)). Its last line reads "Published by Public Knowledge Press.", its
link points to the press's home address, and pressing it opens "Public
Knowledge Press".

## Cause

Up to 3.4 a page address's path could be handed over as a single value:
`PKPRequest::redirect()` was untyped and documented "string or array",
and `PKPPageRouter::url()` wrapped a string into a list. Three pkp-lib
commits of the 3.5 cycle made the path a list everywhere:

- [bee9547b49](https://github.com/pkp/pkp-lib/commit/bee9547b491353e92e53e5ed2da2d197a24be972)
  ("Self-documentation; clean up router delegation", 2024-06-26)
  declared `?array $path` on `PKPRequest::redirect()` and
  `PKPRequest::url()` (`classes/core/PKPRequest.php`, lines 720 and
  771 on today's `main`).
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

`HtmlGalleyHelper::handleOmpUrl()` (omp
`plugins/generic/htmlMonographFile/classes/HtmlGalleyHelper.php` lines
157–168) is the third, and it goes through `PKPRequest::url()`. The
"HTML Monograph File" plugin answers the `CatalogBookHandler::download`
hook with the file's HTML as `getHTMLContents()` prepares it: the
references to embedded proof, dependent and media files rewritten to
download addresses (lines 83–106), the `omp://…` links through a
`preg_replace_callback()` on `handleOmpUrl()` (line 110), the galley
styles of `loadHtmlGalleyStyles()` (line 116), then the
`{$pressTitle}`, `{$siteTitle}` and `{$currentUrl}` placeholders. For
`omp://monograph/{id}`, `handleOmpUrl()` passes `$urlParts[1]`, a
string, as the path of `url()`; `omp://press` passes no path and works.

The `TypeError` leaves `getHTMLContents()` before anything is echoed,
so all of its work is lost, not only the `omp://` links.
`Hook::run()` (lib/pkp `classes/plugins/Hook.php` line 165, which
`Hook::call()` hands over to) catches a plugin's exception, logs it
through `PluginFailureHandler::logIfPluginFailure()` ("failed to handle
the hook") and carries on. `CatalogBookHandler::download()` then serves
the file as stored (line 538), and the reader sees no error. The line is older
than the typing (3.3 has it, when a single value was still accepted);
on `main` it moved from the plugin class into the helper with pkp/omp
[6ca4c09289](https://github.com/pkp/omp/commit/6ca4c092898843853367dc2d390f4df774451475), 2026-05-17.

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
- `handleOmpUrl()` on 3.5 is the same call in
  `plugins/generic/htmlMonographFile/HtmlMonographFilePlugin.php` line
  264 (walked). On 3.4 and 3.3 `PKPRequest::url()` is untyped and the
  page router wraps a single value into a list (code). OJS's
  `htmlArticleGalley` twin passes `[$urlParts[1]]` for `ojs://article/`
  and `ojs://issue/` links (code).
- `getHTMLContents()` has no caller but the plugin on `main` (code),
  though its docblock offers it to themes that show the file inline. A
  theme calling it directly gets no hook's catch, so the same file
  would answer 500 there.
- The `->url(` calls on the request, the dispatcher and the routers
  were read the same way (code). One more passes a single value and is
  not covered by this report's fix; it was not walked:
  `AnnouncementNotificationManager::getNotificationUrl()` (pkp-lib
  `classes/notification/managerDelegate/AnnouncementNotificationManager.php`
  line 69, `main` and 3.5) passes the announcement's ID to
  `Dispatcher::url()`. `PKPNotificationManager::getNotificationUrl()`
  builds the same address itself with a list (line 83), and the
  announcement job calls only the delegate's `notify()`; no screen
  that reaches the delegate's own method was found.
- The Smarty `{url}` function wraps a single value into a list itself
  (`PKPTemplateManager::smartyUrl()`), so templates are not affected.

## Proposed fix

Recommended: pass a list in the three callers, and correct
`redirect()`'s docblock
([fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/earlier-url-path-server-error/fix-omp.diff),
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/earlier-url-path-server-error/fix-ojs.diff);
each carries the same pkp-lib docblock line).

```php
// omp pages/catalog/CatalogBookHandler.php, book()
if (!ctype_digit((string) $submissionId) && $submissionId !== $this->publication->getData('urlPath') && !$subPath) {
    $request->redirect(null, $request->getRequestedPage(), $request->getRequestedOp(), [$submission->getBestId()]);
}

// omp plugins/generic/htmlMonographFile/classes/HtmlGalleyHelper.php, handleOmpUrl()
$url = $request->url(null, 'catalog', 'book', [$urlParts[1]], null, $anchor);

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
Tried on `main` for the HTML file (2026-10-13): at step 20 "the other
book" read `…/en/catalog/book/14` and "the press" the press's home
address, step 21 opened "From Bricks to Brains" in the file's frame,
and nothing was logged. Neighbour check, the same with the fix in and
out: a file whose only link is `omp://press` keeps its press link. The
figure and the placeholder line came into the file after that trial
and were not walked with the fix in; with `handleOmpUrl()` returning,
`getHTMLContents()` runs to its end, as it does for the control's file
on unpatched code.

Left out: the `url()` caller named last in the Cause's reach,
`AnnouncementNotificationManager::getNotificationUrl()`. The same
one-line change (`[$value]`) applies; it was not tried, since no screen
was found that reaches it.

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

- Backport: the book handler's change applies as written to
  `stable-3_5_0`, and the plugin's goes into
  `HtmlMonographFilePlugin::handleOmpUrl()` there (the helper class is
  `main`'s only); OJS needs it on `main` only. On 3.4 and 3.3 only the fallback's wrong ID
  would be worth it.
- The guard: an e2e scenario in U69 (a book with a URL Path changed on
  a later version, opened by the earlier one) and in U50 (an issue's
  address with an unknown galley); in U69 also an HTML book file whose
  `omp://monograph/` link opens the other book.

Small: the same change in each of the three callers, a single value
wrapped in a list, one line each, plus a docblock line; each follows
the pattern its siblings use, and no data needs repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/earlier-url-path-server-error/walk.js)
  takes the Steps on OMP and OJS, on an install freshly loaded from the
  default dataset, then the controls, the neighbour checks and one more
  version with the URL Path cleared:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/earlier-url-path-server-error/walk.js`.
  The fix was tried with `node bin/try-fix.js apply …/fix-omp.diff omp`
  and `… apply …/fix-ojs.diff ojs`, the same script, then `revert`.
- Kept script for the HTML file's steps (12 to 21, U69 A25):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/html-file-omp-links-dead/walk.js)
  with its three files beside it, on OMP:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/html-file-omp-links-dead/walk.js`
  (`MODE=steps` the steps alone, `MODE=nb` the control alone; the
  default both). Walked 2026-10-13 on `main` and `stable-3_5_0`,
  PostgreSQL, datasets from pkp/datasets 384e28b (2026-10-12). The
  figure and the placeholder line were added for a second walk on
  `main`, which showed them unresolved (the Observed); 3.5 was walked
  with the links alone, and its `_getHTMLContents()` does the same work
  in the same order before the same call (code). The fix was tried with
  `node bin/try-fix.js apply …/fix-omp.diff omp`, `MODE=steps` on a
  fresh dataset, then `MODE=nb` with the fix in, and `MODE=nb` again
  after `revert` on a fresh dataset.
- Tips for the HTML file's walks and reads (2026-10-13): OMP `main`
  eb9381314 (lib/pkp f4c2578c94); OMP `stable-3_5_0` 486cbf9eb (lib/pkp
  8094f06bf5); OMP `stable-3_4_0` 0aec65441 and `stable-3_3_0`
  8e72fc883, with lib/pkp read at its own branch tips, 55c8e406b3 and
  5e84acd11b (the older line above names the apps' pointers). Code read: the
  `case 'monograph'` branch of `handleOmpUrl()` on each, with
  `PKPRequest::url()`'s signature; `Hook::run()`'s catch on `main` and
  3.5; the callers of `getHTMLContents()` on `main` (only the plugin);
  OJS `main`'s `htmlArticleGalley` helper.
- Upstream search for the HTML file's links (2026-10-13), pkp/pkp-lib,
  pkp/omp and pkp/ui-library: "omp://monograph", "omp://press", "html
  monograph file links", "HTML book file links", "handleOmpUrl",
  "HtmlGalleyHelper", "HtmlMonographFile", "htmlMonographFile
  TypeError", "must be of type ?array" url. `pkp/pkp-lib#5977` (a 2020
  fatal error on the HTML view page's template) and `pkp/pkp-lib#10501`
  (another caller's single value, on password reset, fixed) are other
  faults.
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
- Crash: the header's `server` rests on the blank pages. The HTML
  file's request answers 200; its error is logged and swallowed by the
  hook, so it is a server failure no reader sees.
- Not driven: the `url()` caller left out of the fix; a journal
  whose issue galley was removed after its address was shared (the
  Steps use a galley number the issue never had, which takes the same
  line).
