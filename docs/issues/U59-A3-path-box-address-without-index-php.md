# Journal form: the address in front of "Path" leaves out "index.php/", so it is not the address the site gives the journal

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#3931` (with `pkp/ojs#2067`) for `pkp/pkp-lib#3594` · [5f3be929e6](https://github.com/pkp/pkp-lib/commit/5f3be929e69f428774dfd0237f666c356859e2b3) · committed 2018-10-23, merged 2019-01-09 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U59 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U59-hosted-journals.md#a3)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

The journal form shows the site's base address and "/" in front of the
"Path" box, as if the journal's address were that followed by the path.
An installation that leaves `restful_urls` Off, the application's
default, keeps "index.php/" in its addresses. There the journal's
address has "index.php/" before the path, so the preview is wrong.

The Site Administrator meets it on Administration › "Hosted Journals",
in "Create Journal" and a journal's "Edit" window, and on the Settings
Wizard's journal tab. The path itself saves correctly and the journal
works. Before a change in 2019, OJS's form printed "The journal's URL
will be …" with the address the site uses.

The test installs run PHP's built-in web server, which passes an address
without "index.php/" to the application, so there the shown address
opens the journal. What Apache or nginx without rewrite rules answers
was not checked.

## Impact

- **Lost**: nothing is stored wrong. The form shows an address the
  site's own links and redirects do not use for the journal.
- **Who**: the Site Administrator, whenever they create a journal,
  press or preprint server or edit its path, on every installation that
  keeps the default `restful_urls = Off`.
- **Way round**: for a journal that exists, the address the site uses
  is in the browser's address bar once the journal is opened from the
  site's home page. In "Create Journal" there is none before the save;
  after it, the new journal's address shows the same way.

Low: a preview that misleads while the task gets done; nothing relies on
it. An install where the shown address was seen not to open the journal
would raise it.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main` (OMP and OPS the same with "Hosted
  Presses" and "Create Press", "Hosted Servers" and "Create Server", and
  the wizard's "Setup" › "Press" and "Server Settings" › "Server" tabs).
- In `config.inc.php`, `restful_urls = Off` (the default) and no
  `base_url[publicknowledge]` line.

Steps:

1. Open the site's address (`<base>/`). With one journal the site opens
   that journal's home page; note the address bar.
2. Sign in as `admin`.
3. Administration › "Hosted Journals".
4. Open the arrow of "Journal of Public Knowledge" › "Edit".
5. Read the address in front of the "Path" box, which holds
   `publicknowledge`. "Close".
6. "Create Journal": read the address in front of the empty "Path" box.
   "Close".
7. The row's arrow › "Settings wizard" › "Journal Settings" › "Journal":
   read the address in front of "Path".

**Expected**: in steps 5 to 7 the address in front of "Path" is the
journal's address up to its path, `<base>/index.php/`, so with the path
it reads `<base>/index.php/publicknowledge`, the journal's address from
step 1.

**Observed**: step 1 lands on `http://127.0.0.1:8062/index.php/publicknowledge/en`.
In steps 5 and 7 the address in front of the box, and the box, read:

```
http://127.0.0.1:8062/ [publicknowledge]
```

and in step 6 the same address in front of an empty box: the site's base
address without "index.php/".

Control: the address read in step 5 followed by the path,
`http://127.0.0.1:8062/publicknowledge`, typed into the address bar,
lands on `http://127.0.0.1:8062/index.php/publicknowledge/en` on the
test install.

## Cause

`PKPContextForm::__construct()` (`lib/pkp/classes/components/forms/context/PKPContextForm.php`,
line 97) gives the `urlPath` field the prefix `$baseUrl . '/'`. Both
callers pass `$request->getBaseUrl()`: `ContextGridHandler::editContext()`
(`lib/pkp/controllers/grid/admin/context/ContextGridHandler.php`, line
239, the "Create Journal" and "Edit" windows) and `AdminHandler::wizard()`
(`lib/pkp/pages/admin/AdminHandler.php`, line 337, the Settings Wizard).

A journal's page address is not built on the base URL. The router builds
it as `PKPRouter::getIndexUrl()`, then "/", then the path
(`PKPRouter::_urlGetBaseAndContext()`), and `getIndexUrl()` is the base
URL plus `/index.php` unless `restful_urls` is On. `config.TEMPLATE.inc.php`
ships `restful_urls = Off` and notes that turning it on needs the
rewrite directive in `.htaccess` or `httpd.conf`. So the prefix matches
the address the application builds only on installations that turned
`restful_urls` On.

The OJS form before the change in Introduced showed the address through
the router: `templates/admin/contextSettings.tpl` put
`{url router=$smarty.const.ROUTE_PAGE journal="path"}` into "The
journal's URL will be {$sampleUrl}." (`admin.journals.urlWillBe`), which
follows `restful_urls`. `pkp/pkp-lib#3594` moved the form to Vue and
replaced that line with the prefix, passing the base URL.

Reach:

- The three apps share the form and both callers; their `ContextForm`
  subclasses pass `$baseUrl` through unchanged (read in the code; the
  steps were taken on all three).
- No other form field takes an address as its `prefix` (a search of the
  three apps and pkp-lib for `'prefix' =>`). The forms that show an
  example address build it through the router, as the old journal form
  did: the category form's "Path" (`CategoryForm`,
  `grid.category.urlWillBe`), OMP's series form, the static pages form
  and the custom navigation menu item (read in the code).
- A journal can have its own address in the config, as a
  `base_url[<path>]` line. The router then uses that address with no
  path after it (`PKPRouter::_urlGetBaseAndContext()`), so no prefix
  can show it, and the fix leaves that case as it is. This was read in
  the code, not set up.
- On PHP's built-in web server the shown address opens the journal
  (the control above, and a second journal made on screen). A web
  server that passes only `index.php/…` addresses to the application
  was not checked.

## Proposed fix

Pass the address a journal's path follows, `$request->getIndexUrl()`,
instead of the base URL in the two callers, and say so in the form's
docblock ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/path-box-address-without-index-php/fix.diff)):

```diff
--- a/lib/pkp/classes/components/forms/context/PKPContextForm.php
+++ b/lib/pkp/classes/components/forms/context/PKPContextForm.php
-     * @param string $baseUrl Base URL for the site
+     * @param string $baseUrl The address a context's path follows in its URLs (PKPRequest::getIndexUrl())
--- a/lib/pkp/controllers/grid/admin/context/ContextGridHandler.php
+++ b/lib/pkp/controllers/grid/admin/context/ContextGridHandler.php
-        $contextForm = new \APP\components\forms\context\ContextForm($apiUrl, $locales, $request->getBaseUrl(), $context);
+        $contextForm = new \APP\components\forms\context\ContextForm($apiUrl, $locales, $request->getIndexUrl(), $context);
--- a/lib/pkp/pages/admin/AdminHandler.php
+++ b/lib/pkp/pages/admin/AdminHandler.php
-        $contextForm = new ContextForm($apiUrl, $locales, $request->getBaseUrl(), $context);
+        $contextForm = new ContextForm($apiUrl, $locales, $request->getIndexUrl(), $context);
```

`getIndexUrl()` is the router's own piece of every page address: it
follows `restful_urls` and the `Router::getIndexUrl` hook, so the prefix
is right in both modes and for a plugin that changes the index URL.

The parameter keeps the name `$baseUrl` while it holds the index URL.
It is positional in `PKPContextForm` and the three apps' `ContextForm`,
so a rename (to `$indexUrl`, say) is optional and touches those four
signatures; the diff leaves it and corrects the docblock.

Tried on `main`, on OJS, OMP and OPS: steps 5 to 7 show
`http://127.0.0.1:8062/index.php/` in front of "Path", and that address
followed by the path opens the journal. A second check shows the fix
leaves saving alone. It creates a second journal with the path `u59d`
through "Create Journal": with the fix and without it the save answers
200, the path is stored as typed and the Settings Wizard opens, and the
address shown followed by `u59d` opens the new journal's home page.

**Alternatives**:

- Build the prefix inside `PKPContextForm` from the request. The form
  takes its addresses from its callers, as the other context forms do;
  reaching for the request there couples it to one more global.
- Restore the old "The journal's URL will be …" description built
  through the dispatcher, as the category form does, and drop the
  prefix. It is right too, but changes how the field looks for a fault
  that is only in the value passed.

**What goes with it**:

- No stored data changes: the prefix is display only, and the path is
  stored as typed with the fix in (the second check above).
- Backport: the diff applies as it stands (a dry run of `patch`) to `stable-3_5_0`. On
  `stable-3_4_0` the wizard's call in `AdminHandler.php` names the class
  in full, and `stable-3_3_0` has the same two calls in `.inc.php`
  files, so there the same one-word change is made by hand.
  `PKPRequest::getIndexUrl()` exists on all three.
- Test: in the PR, each app's Cypress test that creates the context
  (`cypress/tests/data/10-ApplicationSetup/20-CreateContext.cy.js`) can
  assert the text in front of "Path"; the test installs keep
  `restful_urls` Off. pkp-e2e's own scenario for the journal form will
  read the same.

Small: two calls in pkp-lib and a docblock line, following the router's
own pattern, and one assertion in an existing test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/path-box-address-without-index-php/walk.js)
  (helpers in `lib.js` beside it). It takes steps 1 to 7 as written and
  then the control, on an install reset to the default dataset, and
  builds nothing itself:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/path-box-address-without-index-php/walk.js [neighbour]`;
  with `neighbour` it runs the fix's second check alone ("Create Journal" with the name "u59d Journal", the path `u59d`
  and the country Iceland, through the screen).
- Walked on `main` and on `stable-3_5_0` (`PKP_E2E_LINE=stable-3_5_0`
  in front), OJS, OMP and OPS.
- Tips walked. `main`: OJS `b84f8e2e44` (pkp-lib `ddd8ab243a`,
  ui-library `64d67363`), OMP `3b0ecf794` and OPS `c8af945bb7` (pkp-lib
  `3dc90c81a6`, ui-library `280f98c5`). `stable-3_5_0`: OJS
  `091fb65453`, OMP `9c5e24246`, OPS `38b61882d3` (pkp-lib
  `cf3f984335`, ui-library `d4e01883`).
- Code read on 3.5: the prefix at `PKPContextForm.php` line 97 and the
  two calls (`ContextGridHandler.php` line 239, `AdminHandler.php` line
  315), all with `getBaseUrl()`.
- Code read on 3.4 (pkp-lib `32b0f4b4af`) and 3.3 (pkp-lib
  `f6ab331645`), not walked: the same prefix (`PKPContextForm.php` line
  101; `PKPContextForm.inc.php` line 65), the same two calls with
  `getBaseUrl()` (lines 239 and 304; 220 and 278), and each app's
  `ContextForm` taking `$baseUrl` as the parent does.
- Introduced: `git blame` on the prefix line leads through a file move
  and a rename to [5f3be929e6](https://github.com/pkp/pkp-lib/commit/5f3be929e69f428774dfd0237f666c356859e2b3),
  which adds `components/forms/context/PKPContextForm.inc.php` with the
  prefix and the wizard's call with `getBaseUrl()`. The call behind the
  "Create Journal" and "Edit" windows came with `16c2c24e94`
  (2018-12-20). Both were merged with `pkp/pkp-lib#3931`. The old
  form's line was read in OJS at the parent of `43b3907299`, the OJS
  side of the same change, which deletes
  `templates/admin/contextSettings.tpl`.
- Upstream search (2026-10-02): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, issues and PRs. The nearest, `pkp/pkp-lib#7163`
  (journals on their own domain not editable from Administration) and
  `pkp/pkp-lib#4919` (API calls with RESTful URLs), are other faults.
- Unverified: what the shown address answers on Apache or nginx without
  rewrite rules; a "Not Found" there is a guess, since every walk ran
  on PHP's built-in web server. Also unverified: what OMP's form showed
  before the change.
- Not driven: an install with `restful_urls = On`, where by the code
  the prefix is already right and the fix changes nothing
  (`getIndexUrl()` returns the base URL), and an install with
  `base_url[<path>]`.
- The OJS locale key `admin.journals.urlWillBe` is still in
  `locale/en/admin.po`; a search of OJS and its pkp-lib finds no other
  use.
