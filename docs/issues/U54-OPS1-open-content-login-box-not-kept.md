# A preprint server's "log in to view open access content" box says "Saved", is not kept, and visitors still download preprints

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** [3f69b496b5](https://github.com/pkp/ops/commit/3f69b496b5b6b6fa37de1c5b67ee6a41d0d9a8e6) (no pull request; OPS's first development) · 2019-06-03 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U54 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#ops1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A preprint server's "Site Access Options" tab offers "Users must be
registered and log in to view open access content." under "View Preprint
Content". Ticked and saved, the tab says "Saved", but opened again the
box is unticked, and signed-out visitors still open every posted
preprint's files. A journal and a press keep the box and apply it.

Two things are broken. The server never stores the choice, and no code
on a preprint server checks it, so a stored value would change nothing
either.

The proposed fix makes the box work as it does on a journal and a press:
the choice is stored, and a signed-out visitor who opens a preprint's
file is sent to the Login page. Removing the box instead would leave a
preprint server with no way to ask readers to register before they read.

## Impact

- **Lost.** The registration wall the manager chose. The preprints were
  already public, so nothing goes out that was not out before the save.
- **Who.** A Preprint Server manager who wants visitors to register
  before they read, for example to know the server's readership. It
  happens every time.
- **Way round.** "Users must be registered and log in to view the server
  site." on the same tab sends signed-out visitors to the Login page from
  every page of the server, preprint pages and lists included, which is
  more than the manager asked for.

Medium: the "Saved" message misleads, but the manager can see the
failure, since the box is unticked the next time the tab is opened and a
signed-out visit to a preprint still shows its PDF. What is lost is a registration wall in front of
content the server already gives away, and a coarser way round exists.
It would be high if the tab showed the box as ticked after a reload
while the files stayed open.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main` (the same on `stable-3_5_0`):
  the server `publicknowledge`, "Public Knowledge Preprint Server", with
  its posted preprints. Preprint 2, "The Facets Of Job Satisfaction: A
  Nine-Nation Comparative Study Of Construct Equivalence", has one "PDF"
  file. Nothing is created.

Steps:

1. Sign in as `dbarnes` (Preprint Server manager).
2. Open Settings › Users & Roles, tab "Site Access Options"
   (`/index.php/publicknowledge/en/management/settings/access#access`).
   Under "View Preprint Content", "Users must be registered and log in to
   view open access content." is unticked.
3. Tick it and press "Save". "Saved" appears.
4. Reload the page and open "Site Access Options" again.
5. Log out. Open preprint 2 (`/index.php/publicknowledge/en/preprint/view/2`).
6. Press "PDF".

**Expected.** Step 4: the box is still ticked. Step 5: the preprint's
page opens, since the box closes the files, not the landing page. Step 6:
the visitor is sent to the Login page.

**Observed.** Step 3:

```
POST /index.php/publicknowledge/api/v1/contexts/1   (X-Http-Method-Override: PUT)
restrictSiteAccess=false&restrictPreprintAccess=true&disableUserReg=false
→ 200; the returned server carries no "restrictPreprintAccess"
```

Step 4: the box is unticked. Step 5: the preprint's page opens. Step 6:
the PDF viewer opens, "View of The Facets Of Job Satisfaction: A
Nine-Nation Comparative Study Of Construct Equivalence", and its file
answers 200 (`/index.php/publicknowledge/en/preprint/download/2/2/2`,
`application/pdf`). No request failed and no page script failed.

On a journal (OJS, the same dataset, "View Article Content"), the box is
kept, and a signed-out visitor who presses "PDF" on "Signalling Theory
Dividends" lands on the Login page. On a press (OMP, "View Monograph
Content"), the box is kept.

## Cause

OPS's
[`UserAccessForm`](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/classes/components/forms/context/UserAccessForm.php#L30-L36)
offers `restrictPreprintAccess` and saves it through the context API.
OPS's server schema,
[`schemas/context.json`](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/schemas/context.json),
has no such property, and neither has pkp-lib's shared context schema.
OJS declares `restrictArticleAccess` in its schema, and OMP declares
`restrictMonographAccess` in its own.

The schema service's `sanitize()` and
[`SchemaDAO::updateObject()`](https://github.com/pkp/pkp-lib/blob/3dc90c81a638238c2241f5d3086f93865cb943b8/classes/db/SchemaDAO.php#L144-L165)
keep only the properties the schema declares. So the value is dropped
without a validation error.

Nothing in OPS reads the setting either. OJS checks it in
[`ArticleHandler::userCanViewGalley()`](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/pages/article/ArticleHandler.php#L631-L634),
which sends a signed-out visitor to the Login page before a galley is
shown or downloaded. OMP checks its own setting in
`CatalogBookHandler::download()`. OPS's twin,
[`PreprintHandler::userCanViewGalley()`](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/pages/preprint/PreprintHandler.php#L455-L466),
returns true for any posted preprint. Both `view()` (a galley's viewer)
and `download()` (the file) call it.

OPS began as a copy of OJS, with the setting declared, offered and read.
3f69b496b5 (2019-06-03, "remove unnecessary user groups") removed the
journal-only settings from the server schema, `restrictArticleAccess`
among them, while the form went on offering the box and
`ArticleHandler` went on reading it.
[55d5b15cf5](https://github.com/pkp/ops/commit/55d5b15cf50a79bbe5d858b745cd0972756a96db)
(2020-02-04, "fix preprinthandler error") removed the check from the
preprint handler, along with the issue and subscription code.
[0cc844c694](https://github.com/pkp/ops/commit/0cc844c694f6aba42adbea6e554952222da8f7b6)
(2021-02-14, for `pkp/pkp-lib#6759`) renamed the form's field to
`restrictPreprintAccess`.

The reach, and how each was checked:

- The box on "Site Access Options" and a posted preprint's PDF, through
  its viewer and its file: seen in the browser.
- A file opened by its download address, without the viewer: the same
  method, read in the code only.
- The same mistake elsewhere: "Posting Mode" on Settings › Distribution ›
  "Access" (`publishingMode`) was removed from the schema by the same
  commit. It is a separate report,
  [U51-OPS1-posting-mode-not-kept.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U51-OPS1-posting-mode-not-kept.md),
  because the code that reads `publishingMode` is in place, while nothing
  reads this setting. Read in the code.
- No other field of OPS's server forms loses its value this way. The
  other fields no schema declares are saved somewhere else (categories,
  "Notify Users", ORCID, payments), hold no value (a text block, a
  notice), or are on a tab a server does not show (review setup). Read
  in the code.

## Proposed fix

A proposal; the team decides. Declare `restrictPreprintAccess` in OPS's
server schema, as OJS and OMP declare their own, and check it in
`PreprintHandler::userCanViewGalley()` the way OJS's `ArticleHandler`
checks `restrictArticleAccess`: a signed-out visitor who opens a posted
preprint's file is sent to the Login page, and the landing page stays
open. The whole of
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/open-content-login-box-not-kept/fix.diff):

```diff
--- a/schemas/context.json
+++ b/schemas/context.json
@@ -92,6 +92,12 @@
 				"nullable"
 			]
 		},
+		"restrictPreprintAccess": {
+			"type": "boolean",
+			"validation": [
+				"nullable"
+			]
+		},
 		"doiVersioning": {
 			"type": "boolean",
 			"default": true,
--- a/pages/preprint/PreprintHandler.php
+++ b/pages/preprint/PreprintHandler.php
@@ -34,6 +34,7 @@
 use PKP\plugins\Hook;
 use PKP\plugins\PluginRegistry;
 use PKP\security\authorization\ContextRequiredPolicy;
+use PKP\security\Validation;
 use PKP\submission\Genre;
 use PKP\submission\GenreDAO;
 use PKP\submission\PKPSubmission;
@@ -459,6 +460,10 @@
 
         // If the preprint is posted OR author or server manager who can view unposted preprints
         if (($submission && $submission->getData('status') === PKPSubmission::STATUS_PUBLISHED) || ($submission && $user && Repo::submission()->canPreview($user, $submission))) {
+            // Check if login is required for viewing.
+            if (!$user && $request->getContext()->getData('restrictPreprintAccess')) {
+                Validation::redirectLogin();
+            }
             return true;
         }
         return false;
```

Tried on `main`. With the fix in, the box is still ticked after a
reload, and a signed-out visitor who presses "PDF" on preprint 2 lands
on the Login page, while the preprint's own page still opens. Signed in,
`ccorino` (Author, Reader, with no part in preprint 2) still opens and
downloads the PDF, and so does the preprint's author, `ckwantes`.
Unticked and saved, the box is stored off, and a signed-out visitor's
"PDF" opens again.

**Alternatives**

- Declare the property only. The box would then be kept but change
  nothing, so the manager would believe the files closed while they stay
  open: worse than today.
- Take the box off OPS's tab. The tab would stop promising what it does
  not do, but a preprint server would keep no way to ask readers to
  register before they read, which a journal and a press have. A product
  decision, and not a smaller change.
- One shared property in pkp-lib for all three apps. It would need a
  migration of the journals' and presses' stored settings and changes to
  the code that reads them there, for no gain to this fault.

**What goes with it**

- The context API now accepts and returns `restrictPreprintAccess` on
  OPS. No plugin hook changes, and servers stay open until a manager
  ticks the box.
- `view()` fires its `PreprintHandler::view::galley` hook, and
  `download()` its `PreprintHandler::download` hook, after the check, so
  a viewer plugin hooked there is behind the Login page too.
- Together with the "Posting Mode" fix: the two diffs touch neighbouring
  lines of `schemas/context.json` and apply one after the other (checked).
- Backport: the diff applies as written to 3.5 (checked). On 3.4 the
  handler's context line reads `$submission->getStatus()`, so the four
  added lines go in by hand at the same place. On 3.3 the form posts
  `restrictArticleAccess`, so the schema entry takes that name. The
  four lines do not fit there as written: `PreprintHandler.inc.php` is
  not namespaced, and its `userCanViewGalley()` has no `$user`. The
  check goes before that method's `return true` for a posted preprint
  and reads
  `if (!Validation::isLoggedIn() && $request->getContext()->getData('restrictArticleAccess')) Validation::redirectLogin();`,
  with no `use` line, since the file already calls
  `Validation::redirectLogin()` (line 350).
- Test: an end-to-end test that ticks the box, reloads the tab, and
  checks that a signed-out visitor's "PDF" leads to the Login page while
  a signed-in reader's opens.

Small: one schema entry and four lines in one OPS handler, following
OJS, with no data to repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/open-content-login-box-not-kept/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/open-content-login-box-not-kept/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). OPS takes steps
  1–6, then, as a neighbour check, `ckwantes` presses "PDF", and
  `dbarnes` unticks the box and saves before a signed-out visitor
  presses "PDF" again. OJS takes steps 1–6 as the control on article 1;
  OMP takes steps 1–4 (its dataset has no free file to download).
- The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/open-content-login-box-not-kept/fix.diff ops`,
  the script on OPS, then
  `node bin/try-fix.js revert shared/playwright/checks/issues/open-content-login-box-not-kept/fix.diff ops`.
  The neighbour check in walk.js ran with the fix in and out. With the
  fix in,
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/open-content-login-box-not-kept/neighbour.js)
  (`node bin/probe.js ops …/neighbour.js` on a fresh load) ticks the box
  as `dbarnes` and presses preprint 2's "PDF" as `ccorino`, who holds no
  assignment on preprint 2, then signed out.
- Driven on PostgreSQL, on the default dataset from pkp/datasets
  38ab955 (2026-09-30), on `main` and `stable-3_5_0`.
- Tips:
  - `main`: OPS
    [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2)
    and OMP
    [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262),
    both with pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8);
    OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12).
  - `stable-3_5_0`: OPS
    [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    OMP
    [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb)
    and OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    all with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OPS
    [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a)
    with pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - `stable-3_3_0`: OPS
    [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09)
    with pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads: on 3.5, the form, schema and handler are as on `main`.
  On 3.4,
  `UserAccessForm.php` offers `restrictPreprintAccess`,
  `schemas/context.json` has no such property, and
  `PreprintHandler::userCanViewGalley()` (line 403) returns true for a
  posted preprint. On 3.3, `UserAccessForm.inc.php` offers `restrictArticleAccess`
  with the same label, no schema of OPS or pkp-lib declares it, and
  `PreprintHandler.inc.php`'s `userCanViewGalley()` (line 364) returns
  true for a posted preprint.
- Introduced: `git log -S restrictArticleAccess` on OPS's
  `schemas/context.json` finds 3f69b496b5, which removed the property;
  its parent's `ArticleHandler.inc.php` still read it (line 329). `git
  log -S restrictArticleAccess -- pages` finds 55d5b15cf5 removing the
  last code that read it; `git blame` on the form's field leads to ee952a951d
  (PSR-12 formatting), then to 0cc844c694 (the rename). GitHub lists
  no pull request for 3f69b496b5.
- Upstream: pkp/pkp-lib, pkp/ops and pkp/ui-library searched for
  `restrictPreprintAccess`, `restrictArticleAccess`, "log in to view
  open access content", "View Preprint Content" and the symptom's words.
  The one hit, `pkp/pkp-lib#12728` (closed), is about OJS's JATS XML
  download, not this fault.
- Read in the code only: the whole-site way round (pkp-lib
  `RestrictedSiteAccessPolicy`).
- Not driven: MySQL; languages other than English.
