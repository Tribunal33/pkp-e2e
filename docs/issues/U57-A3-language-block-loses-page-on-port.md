# Choosing a language in the sidebar "Language" block lands on the home page when the site's address has a port

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the block passes the page's path)
  - 3.3: none (code; the same)
- **Introduced** `pkp/ojs#4869`, `pkp/omp#1982`, `pkp/ops#973` (with `pkp/pkp-lib#11370`) for `pkp/pkp-lib#11339` · [5ba4d5090a](https://github.com/pkp/ojs/commit/5ba4d5090ac634bb6ada5144271c02687d232c47) · 2025-04-29 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U57 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U57-languages-and-locales.md#a3)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a site whose public address includes a port number, such as
`http://example.org:8080`, choosing a language in the sidebar "Language"
block does not reopen the page the visitor was on. It opens the home
page in the chosen language: the journal's home on a site with one
journal, the site's home on a site with several. The same happens with
the block placed in the site's own sidebar, for example on the site's
Login page.

The language does change; the visitor has to open the page again, and a
search has to be typed again. What decides is the address in the
visitor's browser against the web server's own name for the site, which
never carries the port; the site's configured base address plays no
part.

A site on the usual web ports is affected only when its web server knows
itself by another name than the public address and its list of allowed
hosts is empty; the installer always fills that list. "Change Language"
on the editorial screens is not affected.

## Impact

- **Lost**: the visitor's place, and a search's terms. Nothing stored is
  lost, and nothing tells the visitor why they are on the home page.
- **Who**: every visitor and signed-in reader who uses the block, on
  every public page, on a site whose public address includes a port. The
  block shows only where a journal (or the site) has placed it in the
  sidebar.
- **Way round**: open the page again from the home page, where it now
  shows in the chosen language. The browser's Back does not help: it
  brings the page back, a search with its terms, but in the language the
  visitor left.

Low: the language changes and only the visitor's place is lost, with the
page a few clicks away, and it needs an address with a port, which few
public sites use.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (OJS; OMP and OPS alike, with the
  names in brackets). Its journal, `publicknowledge`, offers English and
  French.
- The install is served on an address with a port of its own, such as
  `http://localhost:8000` (`php -S localhost:8000`).

On the journal's pages:

1. Sign in as `dbarnes`.
2. Open Settings › Website › "Appearance" › "Setup". Under "Sidebar",
   tick "Language Toggle Block" and press "Save".
3. Log out.
4. Open "About the Journal" ("About the Press", "About the Server"),
   `/index.php/publicknowledge/en/about`. The sidebar shows the block
   "Language" with "English" and "français".
5. In the block, choose "français".

**Expected**: "About the Journal" reopens in French, at
`/index.php/publicknowledge/fr_CA/about` ("À propos de cette revue").

**Observed**: the journal's home page opens in French ("Journal de la
connaissance du public"), at `/index.php/publicknowledge/fr_CA`. The
link names the page without the port, and the browser is sent through
the site's home:

```
GET /index.php/publicknowledge/en/user/setLocale/fr_CA?source=localhost%2Findex.php%2Fpublicknowledge%2Fen%2Fabout
→ /index.php/index/fr_CA
→ /index.php/publicknowledge/fr_CA
```

On the site's pages (the site's own sidebar is offered only on a site
with more than one journal):

6. Sign in as `admin`. Open Administration › "Hosted Journals" ("Hosted
   Presses", "Hosted Servers") › "Create Journal" ("Create Press",
   "Create Server"). Fill in the name "u57u2 Second", the initials
   "u57u2", the path `u57u2`, the contact "u57u2 Second" / `u57u2@mailinator.com`
   and the country "Canada", tick "Enable this journal to appear
   publicly on the site", and press "Save".
7. Open Administration › "Site Settings" › "Appearance" › "Setup". Under
   "Sidebar", tick "Language Toggle Block" and press "Save".
8. Log out. Open the site's Login page, `/index.php/index/en/login`.
9. In the block "Language", choose "français".

**Expected**: the Login page reopens in French ("Se connecter"), at
`/index.php/index/fr_CA/login`.

**Observed**: the site's home page opens in French, at
`/index.php/index/fr_CA`, listing the two journals.

Control: signed in as `dbarnes`, on the dashboard, the initials menu ›
"Change Language" › "Français" reopens the dashboard in French, at
`/index.php/publicknowledge/fr_CA/dashboard/editorial`.

## Cause

The block's template, `plugins/blocks/languageToggle/templates/block.tpl`
(the same line in OJS, OMP and OPS), gives each link the page to return
to as `source=$smarty.server.SERVER_NAME|cat:$smarty.server.REQUEST_URI`.
`SERVER_NAME` is the web server's own name for the site, without the
port. The address the browser used, port included, is in the `Host`
header, which `PKPRequest::getServerHost()` reads (`X-Forwarded-Host`
first, then `HTTP_HOST`, and `SERVER_NAME` only as a last resort).

`PKPPageRouter::_setLocale()` (lib/pkp `classes/core/PKPPageRouter.php`,
the `isset($setLocale)` branch and the lines after it) puts the protocol
in front of `source` and removes the router's index address from its
start. That index address, `getIndexUrl()`, is built from
`getProtocol()`, `getServerHost()` and the script path:
`http://localhost:8000/index.php`. The source,
`http://localhost/index.php/publicknowledge/en/about`, does not start
with it, so nothing is removed. The next step, which swaps the locale
after `/publicknowledge`, then finds no `/publicknowledge` at the start
and replaces nothing. With `$replaceCount` at 0, the router falls back to
`/index/{locale}`. The site's home sends a one-journal site on to the
journal's home.

`pkp/pkp-lib#11339` brought this in. During 3.5's development, before
`pkp/pkp-lib#11340`, the block's template passed no source, and the
router took the page to return to from the browser's referrer, which is
not always sent. That change gave the template a source again. Since the
router now swaps the locale inside a full address, the template built
one from `SERVER_NAME` and the request path. The released 3.5 carries
that line. In 3.4 the template passed the path alone, and
`PKPUserHandler::setLocale()` redirected to it, on any port.

The reach:

- Every public page that shows the block, on the journal, press or
  server and on the site (walked: "About", the site's Login page). A
  search result page loses its terms: from
  `/index.php/publicknowledge/fr_CA/search/search?query=lactation`,
  "English" lands on `/index.php/publicknowledge/en` (walked).
- From a journal's home on a site with several journals, the visitor
  lands on the site's home. On a site with one journal the site's home
  sends the visitor on to the journal's home, so the same fallback goes
  unnoticed there (code).
- `allowed_hosts` decides the rest. `_setLocale()` uses `source` only
  when `isAllowedHost()` finds that it starts with an allowed host;
  otherwise it takes the referrer, the browser's full address, which the
  router handles. The installer writes `allowed_hosts` as the public
  host without its port (`PKPInstall::createConfig()`,
  `getServerHost(null, false)`, since `pkp/pkp-lib#7649`, 2022), so:
  - with a port, `example.org/…` starts with the allowed `example.org`,
    the source is used, and the page is lost (walked);
  - on the usual ports, behind a proxy that sets `X-Forwarded-Host` or
    under a web server that knows itself by another name (an nginx
    `server_name _;`), the source names a host that is not allowed, the
    referrer is used, and the page is kept whenever the browser sends a
    referrer (code; not driven);
  - with `allowed_hosts` empty or absent (a `config.inc.php` from before
    that setting, or one the administrator emptied), every source is
    allowed, and such a site loses the page on the usual ports too
    (code; not driven).

## Proposed fix

A proposal. Give the block the address the router builds its own
addresses from. `LanguageToggleBlockPlugin::getContents()` assigns
`$request->getCompleteUrl()` before it branches on the session, and the
template passes it as `source`, in each app's copy of the plugin
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/language-block-loses-page-on-port/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/language-block-loses-page-on-port/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/language-block-loses-page-on-port/fix-ops.diff);
the lines are the same, only the surrounding code differs):

```diff
     public function getContents($templateMgr, $request = null)
     {
+        $request ??= Application::get()->getRequest();
+        // The page to return to once a language is chosen: the whole address, built as the router builds its own
+        $templateMgr->assign('languageToggleSource', $request->getCompleteUrl());
```

```diff
-<a href="{url router=PKP\core\PKPApplication::ROUTE_PAGE page="user" op="setLocale" path=$localeKey source=$smarty.server.SERVER_NAME|cat:$smarty.server.REQUEST_URI}">
+<a href="{url router=PKP\core\PKPApplication::ROUTE_PAGE page="user" op="setLocale" path=$localeKey source=$languageToggleSource}">
```

The two addresses stay in step. `getIndexUrl()` is `getBaseUrl()`
followed by `/index.php` (nothing under `restful_urls`), cached on the
router. `getBaseUrl()` is `getProtocol()`, `getServerHost()` and
`getBasePath()`; `base_url` from the configuration is used only when no
host can be detected, as on the command line. `getCompleteUrl()` is
`getProtocol()`, `getServerHost()` and `getRequestPath()`, then the query
string. `getRequestPath()` is the script's path (`SCRIPT_NAME`) under
plain addresses and `getBasePath()` under `restful_urls`, each followed
by `PATH_INFO`. So the source starts with the index address under both
settings, whatever the port, proxy or server name (code). The exceptions
are a plugin on the `Request::getBaseUrl` or `Router::getIndexUrl` hook
that rewrites one address and not the other, and a base path holding
characters `getBasePath()` encodes, which `SCRIPT_NAME` keeps raw.

With the assign before the session check, the installer's pages, where
the session is off, get the same source. Today that branch sends
`SERVER_NAME` and `REQUEST_URI` too.

The source then has the shape `TopNavActions.vue`
`getSupportedLocalesList()` already sends for "Change Language"
(`document.URL`, the whole address with protocol and port), which
`_setLocale()` handles. The fix keeps the intent of
`pkp/pkp-lib#11339`: no reliance on the referrer, and the locale is
swapped in the returned address. A search found no other link built
from `SERVER_NAME`; the block's template is the only one, in each of the
three apps.

Tried on `main`, OJS, OMP and OPS. The Steps' "français" reopens "À
propos de cette revue" ("A propos de la presse", "À propos du serveur")
at `/index.php/publicknowledge/fr_CA/about`, and the site's Login page
as "Se connecter" at `/index.php/index/fr_CA/login`. As a control, with
the fix the journal's home is kept, a search result is kept with its
terms (`/index.php/publicknowledge/en/search/search?query=lactation`),
and "Change Language" is unchanged. The installer's branch was read, not
driven.

**Alternatives**:

- `$smarty.server.HTTP_HOST` in place of `SERVER_NAME`: one line per app,
  but it still differs from `getServerHost()` behind a proxy that sets
  `X-Forwarded-Host`.
- Pass the path alone, as 3.4 did, and have `_setLocale()` put the
  protocol and `getServerHost()` in front of it: a change to pkp-lib and
  the three apps, and to what the router accepts from every caller.
- Make `_setLocale()` ignore the host and port when it removes the index
  address: it moves the block's mistake into the router, which every
  other caller passes through.

**What goes with it**:

- The comment in `_setLocale()` (lib/pkp
  `classes/core/PKPPageRouter.php`, lines 538–541 at ddd8ab243a) is
  updated to say both callers send the whole address with protocol. It
  reads today:

  ```php
  // The source parameter is coming either from the languageToggle block plugin
  // and contains $smarty.server.SERVER_NAME|cat:$smarty.server.REQUEST_URI
  // i.e. the whole URL except the protocol,
  // or from TopNavActions and contain the whole URL with protocol
  ```
- A theme that overrides `block.tpl` keeps the old line until it takes
  the new variable.
- No stored data, REST API or hook changes. The diffs apply as written to
  `stable-3_5_0`; 3.4 and 3.3 do not need them.
- The guard: an e2e scenario in which a visitor chooses a language in the
  block on a page other than the home page and stays on it. The test
  installs serve on ports of their own, so it fails today (a Planned item
  in spec U57).

Medium: the same two small changes in the plugin of each of the three
app repos, plus the comment in pkp-lib and an e2e test.

## Evidence

- The kept walk takes the Steps on PKP's default test dataset, freshly
  loaded:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/language-block-loses-page-on-port/walk.js),
  with
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/language-block-loses-page-on-port/neighbour.js)
  beside it (the journal's home, a search result page, the browser's
  Back after each, "Change Language"). Run from pkp-e2e:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/language-block-loses-page-on-port/walk.js`,
  `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix is tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/language-block-loses-page-on-port/fix-<app>.diff <app>`
  and taken out with `revert`.
- The installs were served by `php -S 127.0.0.1:<port>`, so
  `SERVER_NAME` was `127.0.0.1` and each link's source read
  `127.0.0.1/index.php/…`; the Steps write the team's usual
  `localhost:8000`.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, unfixed: the
  same redirects on both lines. `neighbour.js` ran unfixed and with
  the fix on `main`, and unfixed on 3.5 (where "Change Language" also
  keeps the page). The fix was tried on `main` only; the diffs were
  revised once (the assign moved before the session check) and tried
  again.
- Branch tips. `main`: OJS b84f8e2e44 (lib/pkp ddd8ab243a, ui-library
  64d67363), OMP 3b0ecf794 and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  ui-library 280f98c5). `stable-3_5_0`: OJS c346ee00a5 (lib/pkp
  3bb4450bea), OMP c7b45f88e and OPS 8eaf899468 (lib/pkp 1fb843f491).
  `stable-3_4_0`: OJS 75cc2d488b, OMP 0aec65441, OPS acd8ae704b, lib/pkp
  32b0f4b4af. `stable-3_3_0`: OJS ac77c9fb35, OMP 8e72fc883, OPS
  c5532e2161, lib/pkp f6ab331645. pkp/datasets c657990, PostgreSQL.
- Code reads: on `main` and 3.5, each app's `block.tpl` and
  `LanguageToggleBlockPlugin.php`, lib/pkp `PKPPageRouter::_setLocale()`,
  `PKPRouter::getIndexUrl()`, `PKPRequest::getServerHost()`,
  `getBaseUrl()`, `getBasePath()`, `getRequestPath()`,
  `getCompleteUrl()` and `getRequestUrl()`, `AllowedHostsPolicy`,
  `PKPInstall::createConfig()`, ui-library
  `TopNavActions.vue`. On 3.4 and 3.3, each app's `block.tpl`
  (`source=$smarty.server.REQUEST_URI`) and lib/pkp
  `pages/user/PKPUserHandler.php` (3.3: `PKPUserHandler.inc.php`)
  `setLocale()`, which redirects to a source starting with `/`.
- The trace: `git blame` on the template's link line gives OJS
  5ba4d5090a (2025-04-29), OMP dc9733c3d9 and OPS 1a730ebf74
  (2025-05-05), "pkp/pkp-lib#11339 consider source in language toggle
  block plugin again"; lib/pkp's side is e32632c953 in `pkp/pkp-lib#11370`.
  The issue lists the `main` PRs above and the `stable-3_5_0` ones
  (`pkp/pkp-lib#11340`, `pkp/ojs#4855`, `pkp/omp#1979`, `pkp/ops#970`).
  Before it, the block had no source and the router used the referrer.
- Upstream search 2026-10-01, pkp/pkp-lib, pkp/ojs and the pkp
  organisation: "language toggle port", "language block redirect home",
  "setLocale source", "SERVER_NAME", "languageToggle", "_setLocale",
  "language toggle reverse proxy". `pkp/pkp-lib#11339` and
  `pkp/pkp-lib#11072` are the earlier faults of the same redirect,
  closed, fixed; `pkp/pkp-lib#13182` (open) is about another journal's
  locale in built addresses, not this.
- Not driven: a site on the usual ports, a site behind a proxy or under
  nginx, a site whose `allowed_hosts` is empty or names only the host
  with its port, the installer's pages, and the journal's home on a site
  with several journals (the Cause marks them "code"). The test
  installs' `allowed_hosts` lists only their own address, and
  `AllowedHostsPolicy` refuses any other `X-Forwarded-Host`, so a proxy
  with another public name could not be imitated on them. MySQL was not checked; the fault is in a link and
  touches no query.
