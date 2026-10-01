# On a site with a port in its address, the sidebar "Language" block loses the page being read

- **Severity** low
- **Effort** medium
- **Kind** intention gap
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the block links back to the page's own path)
  - 3.3: none (code; the block links back to the page's own path)
- **Introduced** `pkp/pkp-lib#11370`, `pkp/ojs#4869`, `pkp/omp#1982`, `pkp/ops#973` (`pkp/pkp-lib#11340`, `pkp/ojs#4855`, `pkp/omp#1979`, `pkp/ops#970` on `stable-3_5_0`) for `pkp/pkp-lib#11339` · [5ba4d5090a](https://github.com/pkp/ojs/commit/5ba4d5090ac634bb6ada5144271c02687d232c47) · 2025-04-29 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U57 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U57-languages-and-locales.md#a3)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a site whose address carries a port number, such as
`http://example.org:8080`, choosing a language in the sidebar "Language"
block does not reopen the page the visitor was on. It opens the site's
home page in the chosen language. On a site with one journal, the site's
home forwards to that journal, so the visitor ends on the journal's home
page. Either way, the visitor has to find their page again.

The same happens with the block placed in the site's sidebar: a language
chosen on the site's login page opens the site's home. "Change Language"
in the user menu of the editorial screens is not affected.

A port in the address is confirmed on screen. Reading the code, the same
happens on a site where the web server's own name for the site differs
from the address the visitor used, but only when `allowed_hosts` is
empty or lists that name; this was not tried on screen. 3.4 and 3.3 are
not affected, because their block sends back only the page's path. The
fix for `pkp/pkp-lib#11339` meant to stop exactly this landing on the
home page, and it missed this case. The fix touches the block in three
app repositories; a one-file router change in pkp-lib would be smaller
but less exact.

## Impact

- **Lost**: the visitor's place (an article, a search result, About).
  The language change itself works, and nothing stored is lost or wrong.
- **Who**: visitors who use the block where a journal, press or server
  has placed it in its sidebar.
  - Confirmed: sites whose address carries a port other than 80 or 443.
    That is the usual development and test setup, and rare in
    production.
  - From the code only: sites whose web server reports a different name
    for the site than the one the visitor used, when `allowed_hosts` is
    empty (the shipped default) or lists that name.
- **Way round**: go back to the page by hand, or change the language in
  the page's address.

Low: the language changes and nothing stored is lost; the visitor only
loses their place and finds the page again. That stays true however many
sites the code-only case reaches.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), served at an
  address with a port.
- Open the install at a host its `allowed_hosts` setting lists. The
  dataset's `config.inc.php` lists `"localhost"`, so serve it at
  `http://localhost:<port>`, such as `http://localhost:8000`. At a host
  that `allowed_hosts` does not list (`127.0.0.1`, say), every language
  choice opens the site's home for another reason: the steps, the
  "Change Language" control below, and the block with the proposed fix.
  The walk for this report served the dataset at
  `http://127.0.0.1:<port>`, with `127.0.0.1` added to `allowed_hosts`.

The journal's sidebar:

1. Sign in as `rvaca` (the Journal manager; Press manager on OMP,
   Preprint Server manager on OPS).
2. Open Settings › Website › "Appearance" › "Setup".
3. Under "Sidebar", tick "Language Toggle Block" and press "Save".
4. Sign out.
5. Open "About the Journal" (`/index.php/publicknowledge/en/about`).
6. In the sidebar block headed "Language", choose "français".

**Expected**: "About the Journal" opens again in French, at
`/index.php/publicknowledge/fr_CA/about`.

**Observed**: the journal's home page opens in French, at
`/index.php/publicknowledge/fr_CA`. The link sends the page's address
without its port, and the server answers with the site's home, which
forwards to the one journal:

```
GET /index.php/publicknowledge/en/user/setLocale/fr_CA?source=localhost%2Findex.php%2Fpublicknowledge%2Fen%2Fabout
302 Location: http://localhost:8000/index.php/index/fr_CA
302 Location: http://localhost:8000/index.php/publicknowledge/fr_CA
```

The site's sidebar:

7. Sign in as `admin`.
8. Open Administration › "Hosted Journals" ("Hosted Presses", "Hosted
   Servers") › "Create Journal". Fill the required fields with the name
   "u57w51 Journal" and the path `u57w51`, tick English, and press
   "Save". A second journal is needed because a site with one journal
   has no "Appearance" tab in its "Site Settings".
9. Open Administration › "Site Settings" › "Appearance" › "Setup".
10. Under "Sidebar", tick "Language Toggle Block" and press "Save".
11. Sign out, and open the site's login page
    (`/index.php/index/en/login`).
12. In the "Language" block, choose "français".

**Expected**: the site's login page opens in French, at
`/index.php/index/fr_CA/login`.

**Observed**: the site's home page opens in French, at
`/index.php/index/fr_CA`. Now that the site has two journals, a choice
in the journal's own block also opens the site's home
(`/index.php/index/fr_CA`), from the journal's home page, a search
result page or About.

Control: `rvaca` choosing "français" under "Change Language" in the
user menu of Settings › Website gets the same screen in French
(`/index.php/publicknowledge/fr_CA/management/settings/website`).

## Cause

The block's template builds the address to return to from the web
server's name and the request path:
`plugins/blocks/languageToggle/templates/block.tpl` (each app has its
own copy) passes
`source=$smarty.server.SERVER_NAME|cat:$smarty.server.REQUEST_URI`.
`SERVER_NAME` is the server's name without the port, so on
`localhost:8000` the block sends
`localhost/index.php/publicknowledge/en/about`.

`PKPPageRouter::_setLocale()` (pkp-lib, `classes/core/PKPPageRouter.php`)
accepts that source if `isAllowedHost()` passes it, adds the protocol,
and strips the installation's index address from it to find the page.
The index address, `PKPRouter::getIndexUrl()`, is
`PKPRequest::getBaseUrl()` plus `/index.php` (when `restful_urls` is
Off). `getBaseUrl()` is the protocol, `getServerHost()` and
`getBasePath()`. `getServerHost()` takes `X-Forwarded-Host`, then
`Host`, then `SERVER_NAME`, and keeps the port
(`http://localhost:8000/index.php`). The strip fails, so the router
takes its fallback for an address it cannot read and redirects to
`/index/{locale}`, the site's home.

The source came back in `pkp/pkp-lib#11339`. Its fix stopped relying on
the browser's `Referer`, which is sometimes missing, and had the block
send the page's address instead; the address it chose drops the port.
The same issue gave "Change Language" a source too, and that one sends
the browser's full address (`document.URL` in `TopNavActions.vue`).

Reach (read in the code; only the port case was driven):

- A site on ports 80 and 443 whose `SERVER_NAME` matches the host the
  visitor used is not affected.
- A site whose `SERVER_NAME` differs from that host is affected in the
  same way. The web server sets `SERVER_NAME` from its own configuration,
  for example an nginx `server_name` listing several names (the first is
  sent) or `_`, or a backend behind a reverse proxy that forwards
  another host.
- `isAllowedHost()` decides whether the router uses the block's source
  at all. When `allowed_hosts` is empty (the shipped default) or lists
  the source's host, the source is used and the page is lost. When it
  refuses the source (a host listed only with its port, such as
  `"example.org:8080"`, or a server name it does not list), the router
  falls back to the `Referer`, which carries the visitor's address, and
  the page is kept.
- No other code builds this source: a search of the three apps,
  pkp-lib and ui-library for `setLocale` links finds only the block and
  `TopNavActions.vue`. No bundled theme overrides the block's template.

## Proposed fix

Have the block send the page's full address, built the way the router
builds its own. Each app's `LanguageToggleBlockPlugin::getContents()`
assigns `$request->getCompleteUrl()`, and the template passes it.
`_setLocale()` already uses `getCompleteUrl()` when it corrects the
language in a page's address. OJS shown; OMP and OPS are the same two
changes
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/language-block-lands-on-site-home/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/language-block-lands-on-site-home/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/language-block-lands-on-site-home/fix-ops.diff)):

```diff
--- a/plugins/blocks/languageToggle/LanguageToggleBlockPlugin.php
+++ b/plugins/blocks/languageToggle/LanguageToggleBlockPlugin.php
@@ -87,6 +87,9 @@
         $templateMgr->assign('enableLanguageToggle', count($locales) > 1);
         $templateMgr->assign('languageToggleLocales', $locales);
+        // The page being read, as the router builds its own addresses (protocol, host and port),
+        // so that PKPPageRouter::_setLocale() can send the visitor back to it
+        $templateMgr->assign('languageToggleSource', $request->getCompleteUrl());
--- a/plugins/blocks/languageToggle/templates/block.tpl
+++ b/plugins/blocks/languageToggle/templates/block.tpl
-					<a href="{url … op="setLocale" path=$localeKey source=$smarty.server.SERVER_NAME|cat:$smarty.server.REQUEST_URI}">
+					<a href="{url … op="setLocale" path=$localeKey source=$languageToggleSource}">
```

Why it works: `getCompleteUrl()` is built from the same `getServerHost()`
and, through `getRequestPath()`, the same path base as `getIndexUrl()`,
in both `restful_urls` modes, so the router's strip always matches. The
block then sends what "Change Language" sends, an address with protocol,
host and port. This keeps the aim of `pkp/pkp-lib#11339`: an explicit
source, no reliance on the `Referer`. Taking the host from
`X-Forwarded-Host` adds no redirect exposure, because `isAllowedHost()`
still checks the source and the router already builds every address
from that host.

Tried on `main` in the three apps: About, the site's login page, the
journal's home page and a search result page (its query kept) each
reopened in the chosen language, and "Change Language" still reopened
the same screen. The trial assigned
`($request ?? Application::get()->getRequest())->getCompleteUrl()`.
The diffs now drop the `??`, which was not tried again: the block's
only caller, `PKPTemplateManager`, always passes the request, and OJS
and OPS already call `$request->isPost()` on the method's first line.

**Alternatives**:

- `$smarty.server.HTTP_HOST` in place of `SERVER_NAME`: a one-word
  template change. It carries the port, but behind a proxy that sets
  `X-Forwarded-Host` it disagrees with the router.
- Make `_setLocale()` compare only the path of a port-less source: one
  file in pkp-lib, and it would also cover a third-party theme that
  overrides the block's template. But the router would then trust a path
  whose host it cannot check, and it would compare every source
  differently, "Change Language"'s full address included.

**What goes with it**:

- Update the comment in `_setLocale()` that describes the block's
  source as "the whole URL except the protocol". The branch that adds
  the protocol can stay for themes that copied the old template.
- No stored data to repair.
- The diffs apply as they stand to `stable-3_5_0` (checked with
  `patch --dry-run`). 3.4 and 3.3 need nothing.
- Guard: an end-to-end test that places the block, chooses a language
  on a page other than the home page, and checks that page reopens. A
  test install served by `php -S` runs on a port, so such a test would
  have caught this.

Medium: two lines in each of three app repositories, following the
router's own pattern, with an end-to-end test.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/language-block-lands-on-site-home/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/language-block-lands-on-site-home/lib.js)).
  It takes steps 1–12, then the control and three more choices (the
  journal's home page, a search for "water", French About back to
  English). Run on an install reset to the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/language-block-lands-on-site-home/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With each
  `fix-<app>.diff` applied, the same walk showed every Expected.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PKP's
  default test dataset (pkp/datasets 38ab955, 2026-09-30), on
  PostgreSQL. The Observed request is written with the Steps'
  `localhost:8000`; the walk saw the same answers at `127.0.0.1` on its
  own port. Not database-dependent.
- Tips: `main` OJS bade233f73 (pkp-lib 2e377d27fc), OMP 3b0ecf794 and
  OPS c8af945bb7 (pkp-lib 3dc90c81a6); `stable-3_5_0` OJS 92b9a16b48,
  OMP 3081c9b00, OPS cf4fce69bd (pkp-lib a9c76aed62); `stable-3_4_0` OJS
  9571d8fde7, OMP 0aec65441, OPS acd8ae704b (pkp-lib df13621c2d);
  `stable-3_3_0` OJS 9fdb9bcf9a, OMP 8e72fc883, OPS c5532e2161 (pkp-lib
  d446601ebe).
- 3.4 and 3.3 (code): each app's `block.tpl` passes
  `source=$smarty.server.REQUEST_URI`, and `PKPUserHandler::setLocale()`
  (`pages/user/PKPUserHandler.php`, `.inc.php` on 3.3) redirects to a
  source that starts with `/`. There is no host to compare, so the page
  is kept on any port.
- Introduced: `git blame` on the template line gives
  [5ba4d5090a](https://github.com/pkp/ojs/commit/5ba4d5090ac634bb6ada5144271c02687d232c47)
  (OJS),
  [dc9733c3d9](https://github.com/pkp/omp/commit/dc9733c3d9c4c2123c8bb0e3effd3046291ba876)
  (OMP) and
  [1a730ebf74](https://github.com/pkp/ops/commit/1a730ebf745a9aefc5b0be34773addfaab2c9c17)
  (OPS), "consider source in language toggle block plugin again". The
  router's side is
  [e32632c953](https://github.com/pkp/pkp-lib/commit/e32632c953afc0010ebf5c7871927c4a6bd548fc)
  (pkp-lib, "do not rely on http_referrer when using language toggle
  block plugin"). Both were made for `pkp/pkp-lib#11339` ("UI Language
  Toggle - Language change redirects to index page"), which was QA'd and
  closed on a multi-journal install whose port it does not state. On
  `stable-3_5_0` the template change is f681058a56 (`pkp/ojs#4855`).
  Between 2c65b53000 ("Show locale in url in multilingual contexts",
  2024-04-16) and that change, the block sent no source and the router
  used the `Referer`, which carries the port.
- Upstream: of the issues found on pkp/pkp-lib, pkp/ojs, pkp/omp,
  pkp/ops and pkp/ui-library, only `pkp/pkp-lib#11339` and its
  predecessor `pkp/pkp-lib#11072` (the journal's home page on a
  multi-journal site, closed) concern the block's redirect, and neither
  mentions a port.
- Not driven: a site on ports 80 or 443, and the server-name and
  reverse-proxy cases of the Cause.
