# Visitors opening a deleted or mistyped "Full Issue" galley address get an empty page, not the issue

- **Severity** low
- **Effort** small
- **Kind** intention gap
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** [bee9547b49](https://github.com/pkp/pkp-lib/commit/bee9547b491353e92e53e5ed2da2d197a24be972) (pkp-lib, pushed without a pull request) · 2024-06-26 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#11245` (closed; its fix for this code went into `stable-3_5_0` and was never ported to `main`)
- **Tracked in** spec U50 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a14)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A "Full Issue" address that names no galley of the issue (a wrong
number, a word, another issue's galley) is expected to open the issue's
page. Instead the app fails on the server and the visitor gets an empty
page, so a stale or mistyped galley link leads nowhere.

The server answers `500`, both for the galley's viewing address and for
its download address. The code means to send the visitor to the issue's
page instead. OJS 3.5 does that, because pkp fixed the line there under
`pkp/pkp-lib#11245`. The fix never reached `main`, so the next release
would bring the fault back unless the one-line fix is ported.

## Impact

- **Lost:** nothing is stored wrong. The visitor sees a blank page with
  no message, and the error goes only to the server's log.
- **Who:** anyone, signed in or not, who opens the address of a "Full
  Issue" galley the journal has deleted, or mistypes one. A galley that
  is deleted, or deleted and added again, loses its address, because the
  new galley gets a new number. Replacing the file through the galley's
  "Edit" keeps the address. The journal's own pages never link to a
  missing galley, so such addresses come from links saved or shared
  earlier.
- **Way round:** open the journal and choose the issue under "Archives".

Low: the issue stays reachable and nothing is lost. It would be medium
if the journal's own pages linked to a missing galley.

## Steps to reproduce

Preconditions: PKP's default test dataset for OJS `main`, with
`display_errors = Off` under `[debug]` in `config.inc.php`, as shipped.
The journal `publicknowledge` has a published, current issue, "Vol. 1
No. 2 (2014)" (ID 1), with no "Full Issue" galleys. The steps add a
"PDF" galley to it.

Setting up, as `dbarnes`:

1. Sign in as `dbarnes`.
2. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Issue
   Galleys" › "Create Issue Galley": type "PDF" as the "Galley Label",
   upload any PDF file and press "Save".
3. Sign out.

A mistyped address, signed out:

4. "Archives" › "Vol. 1 No. 2 (2014)". Under "Full Issue", press "PDF":
   the PDF viewer opens at `/index.php/publicknowledge/en/issue/view/1/1`,
   and its "Download" points to
   `/index.php/publicknowledge/en/issue/download/1/1`.
5. Open `/index.php/publicknowledge/en/issue/view/1/999`, a galley
   number the issue does not have.
6. Open `/index.php/publicknowledge/en/issue/view/1/nosuch`.

A stale address:

7. Sign in as `dbarnes`; on the same "Issue Galleys" tab press the
   "PDF" row's "Delete" and answer "OK". Sign out.
8. Open the viewer's address from step 4
   (`/index.php/publicknowledge/en/issue/view/1/1`).
9. Open the "Download" address from step 4
   (`/index.php/publicknowledge/en/issue/download/1/1`).

**Expected:** steps 5, 6, 8 and 9 land on the issue's page, "Vol. 1
No. 2 (2014)", as the code's comment says ("Invalid galley id, redirect
to issue page").

**Observed:** step 4 opens the viewer ("View of Vol. 1 No. 2 (2014)").
Steps 5, 6, 8 and 9 each answer `500` with an empty page: no title, no
text. With `display_errors` On, the page shows the error text instead.
The server log, for each:

```
PHP Fatal error:  Uncaught TypeError: PKP\core\PKPRequest::redirect(): Argument #4 ($path) must be of type ?array, int given, called in pages/issue/IssueHandler.php on line 82 and defined in lib/pkp/classes/core/PKPRequest.php:718
```

Control: on OJS `stable-3_5_0`, steps 5, 6, 8 and 9 answer `302` to
`/index.php/publicknowledge/en/issue/view/1` and show the issue's page.

## Cause

`IssueHandler::initialize()` (`pages/issue/IssueHandler.php` lines
74–86) looks up the galley that the address names, within the issue
(`IssueGalleyDAO::getByBestId($galleyId, $issue->getId())`). When it
finds none, line 82 redirects to the issue's page:

```php
$request->redirect(null, null, 'view', $issue->getId());
```

It passes the issue ID as a bare integer. Since
[bee9547b49](https://github.com/pkp/pkp-lib/commit/bee9547b491353e92e53e5ed2da2d197a24be972)
("Self-documentation; clean up router delegation", 2024-06-26),
`PKPRequest::redirect()` (`lib/pkp/classes/core/PKPRequest.php` line
718) declares `?array $path`, so PHP throws a `TypeError` before any
redirect is sent. Before that commit the path was untyped, and the page
router wrapped a single value in a list. `PKPPageRouter::url()` and
`Dispatcher::url()` took the same `?array` type later, in
[d9f093ea68](https://github.com/pkp/pkp-lib/commit/d9f093ea68d3ddab0b7eea554c989b9f078258a8) (2024-06-28)
and [5189e06cce](https://github.com/pkp/pkp-lib/commit/5189e06ccea6fcad8bc8f9b4d2009de5f89bc9d8)
(2024-07-05). But `redirect()` already refuses the integer before either
router sees it.

`pkp/pkp-lib#11245` ("Consider path parameter in dispatcher and request
url function to be null or array") listed this call among those to
correct. It was closed on 2025-04-09 as done on `main` and
`stable-3_5_0`. On `stable-3_5_0`, the change to this line came in
[ed58cee7e8](https://github.com/pkp/ojs/commit/ed58cee7e8e6410bc792d9162e83a6ee37dbdab6),
a "Submodule updates" commit. `main` has no counterpart to it. The
issue's commit on OJS `main`,
[0e4439e083](https://github.com/pkp/ojs/commit/0e4439e0833058750bdf947ff0230a42c97f973f),
leaves `IssueHandler.php` untouched. So do the submodule updates of
those two days,
[a38f91a2f0](https://github.com/pkp/ojs/commit/a38f91a2f027e08fe26f782cf231cfaaecb67c46) and
[1a4949e9a4](https://github.com/pkp/ojs/commit/1a4949e9a4d737ae7034db28edbbb45661ebc8ed).

Reach:

- Both addresses that load a galley: `issue/view/{issue}/{galley}` and
  `issue/download/{issue}/{galley}` (walked).
- Any galley value the issue lacks: a number, a word, a deleted galley
  (walked). Another issue's galley was read in the code: the lookup only
  searches this issue, so it finds nothing and reaches the same line.
- Other calls with the same mistake: I searched every `->redirect(` and
  `->url(` call in OJS, OMP and OPS on `main`, with their `lib/pkp` and
  bundled plugins. One more call passes a single value, in OMP's
  `CatalogBookHandler::book()` (`pages/catalog/CatalogBookHandler.php`
  lines 128–132 on `main`, 126–130 on `stable-3_5_0`). When a visitor
  opens a book through an outdated URL path, it redirects to the
  current version's URL path (a string), or to its ID (an integer) when
  that version has none. It passes either one without a list. This was
  read in the code, not walked.
- Not this fault: `pkp/pkp-lib#11172` (open) reports `issue/archive/a/b`
  failing in the same method. There, `archive` has no issue, so line 78
  calls `getId()` on null. The code on `main` still has it, and this
  fix does not change it.

## Proposed fix

A proposal; the team decides. Pass the path as a list, as `stable-3_5_0` already does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/full-issue-wrong-galley-address-empty-page/fix.diff)):

```diff
--- a/pages/issue/IssueHandler.php
+++ b/pages/issue/IssueHandler.php
@@ -79,7 +79,7 @@
 
             // Invalid galley id, redirect to issue page
             if (!$galley) {
-                $request->redirect(null, null, 'view', $issue->getId());
+                $request->redirect(null, null, 'view', [$issue->getId()]);
             }
 
             $this->setGalley($galley);
```

This follows the rule `pkp/pkp-lib#11245` set: the handler's other
redirects that carry a path pass a list (`current()` passes
`[$issue->getBestIssueId()]`). The typed signature from bee9547b49
stays.

Tried on `main`: steps 5, 6, 8 and 9 answered `302` to
`/index.php/publicknowledge/en/issue/view/1` and showed the issue's
page. The fix left the working cases alone. These gave the same result
with the fix and without it:

- A galley that exists still opened in the viewer.
- Its "Download" still served `article.pdf`.
- Signed out, `issue/view/2/999` (the unpublished issue) still led to
  Login, like `issue/view/2`.

**Alternatives:**

- Let `PKPRequest::redirect()` accept a single value and wrap it. That
  undoes the rule `pkp/pkp-lib#11245` set, and it changes a signature
  that plugins call.
- Redirect to `[$issue->getBestIssueId()]`, as `current()` does, so an
  issue with a URL path keeps it in the address. That is reasonable, but
  this line would then differ between `main` and `stable-3_5_0`.

**What goes with it:**

- Correct the docblock of `PKPRequest::redirect()` (line 713), which
  still reads "`@param $path string or array containing path info for
  redirect`" and so invites calls like this one.
- OMP's `CatalogBookHandler::book()` makes the same mistake and needs
  the same one-line change, `[$newArgs]`, on `main` and `stable-3_5_0`.
  It is not in this diff and was not tried.
- `pkp/pkp-lib#11172` needs its own check that there is an issue before
  the galley lookup in `initialize()`.
- No backport is needed, and no stored data, API or hook changes.
- Regression test: an e2e check that a signed-out visitor who opens a
  "Full Issue" address with a galley number the issue lacks lands on
  the issue's page. The handler has no unit tests to extend.

Small: port one line from `stable-3_5_0`, plus a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/full-issue-wrong-galley-address-empty-page/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/full-issue-wrong-galley-address-empty-page/walk.js [neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With no argument
  it takes steps 1–9. With `neighbour` it takes steps 1–4 and then the
  checks listed under "Tried on `main`".
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/full-issue-wrong-galley-address-empty-page/fix.diff ojs`,
  the script with and without `neighbour`, then
  `node bin/try-fix.js revert ojs`. `neighbour` was also run without the
  fix.
- Driven on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30): steps 1–9 on `main` and on `stable-3_5_0`. Apart from the
  four `500`s on `main`, no request failed and no page script failed.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833)
    with pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144)
    with pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads for 3.4 and 3.3:
  - 3.4: `IssueHandler.php` line 79 passes the bare ID.
    `PKPRequest::redirect()` (line 741) has no type on the path, and
    `PKPPageRouter::url()` (lines 311–317) wraps a single value in a
    list.
  - 3.3: the same, in `IssueHandler.inc.php` line 55,
    `PKPRequest.inc.php` line 658 and `PKPPageRouter.inc.php` lines
    267–273.
- Introduced: `git blame` on `IssueHandler.php` line 82 gives the PSR-12
  reformat 665ed1f925 (2021). The line is older and has kept its
  meaning. The fault begins where `redirect()` took its `?array` type,
  in bee9547b49 on pkp-lib `main`. That commit has no pull request: it
  sits on the branch's first-parent line.
- Beside this report: the
  [U51 A14 report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U51-A14-restrict-only-pdf-html-galley-refused.md)
  also changes `IssueHandler.php`, in `userCanViewGalley()`. There, the
  access check needs a galley when `issue/download/{id}` carries no
  galley ID. That is a different cause in a different method, and the
  two diffs apply together (checked with `patch`).
