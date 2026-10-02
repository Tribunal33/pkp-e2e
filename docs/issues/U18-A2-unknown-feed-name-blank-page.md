# A web feed address with a mistyped or missing feed name shows a blank page instead of "404 Not Found"

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the address lands on the home page)
- **Introduced** by Jonas Raoni Soares da Silva (jonasraoni), app by app:
  OPS in `pkp/ops#351` for `pkp/pkp-lib#7623` · [08f5923593](https://github.com/pkp/ops/commit/08f5923593edfded42856025ab5e06b4a3bccc56) · 2022-09-11;
  OJS in `pkp/ojs#3821` for `pkp/pkp-lib#8731` · [b9d9cdb8c4](https://github.com/pkp/ojs/commit/b9d9cdb8c46a1a8e346e69a12e12b0f87396e5c0) · 2023-03-08;
  OMP when the three apps moved to the shared plugin, `pkp/webFeed#1` for `pkp/pkp-lib#8770`
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U18 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U18-web-feeds.md#a2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

The application fails on the server when a visitor or a feed reader
opens a web feed address of a journal, press or preprint server with a
feed name that does not exist, or with none: the browser shows a blank
page with no tab title. The feed names are "atom", "rss2" and "rss" in
lower case, so a mistyped subscription such as "ATOM" or "atom.xml"
fails this way.

They expect "404 Not Found": the same kind of address with a plugin name
that does not exist answers that. On 3.3 the address led to the home
page; since 3.4 the application fails.

Nothing is lost: the three feeds work at their own addresses, and the
feed links the pages offer lead to those. Each such visit adds a server
error to the log. "Web Feed Plugin" is on by default.

## Impact

- **Lost**: nothing.
- **Who**: anyone with a wrong feed address, typed by hand or copied
  badly. No link on screen leads there.
- **Way round**: the correct address.

Low: it would rise only if a screen, or the feed links a page offers to
feed readers, pointed at such an address.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, context `publicknowledge`.
  "Web Feed Plugin" is on there, so nothing is created.
- `display_errors = Off` in the `[debug]` section of `config.inc.php`,
  the shipped default and the dataset's setting.
- Signed out.

Steps:

1. Type `/index.php/publicknowledge/gateway/plugin/WebFeedGatewayPlugin/atom`
   in the browser's address bar. The Atom feed shows.
2. Type `/index.php/publicknowledge/gateway/plugin/WebFeedGatewayPlugin/ATOM`.
3. Type `/index.php/publicknowledge/gateway/plugin/WebFeedGatewayPlugin/atom.xml`.
4. Type `/index.php/publicknowledge/gateway/plugin/WebFeedGatewayPlugin/json`.
5. Type `/index.php/publicknowledge/gateway/plugin/WebFeedGatewayPlugin`,
   with no feed name.
6. Type `/index.php/publicknowledge/gateway/plugin/NoSuchPlugin/atom`.

**Expected**: steps 2 to 5 show "404 Not Found" with status 404, as step
6 does.

**Observed**: steps 2 to 5 each show a blank page with no tab title. The
address moves to `/index.php/publicknowledge/en/gateway/…` and answers
status 500 with an empty body. The server log has, for each:

```
PHP Fatal error:  Uncaught Exception: Invalid feed format in …/plugins/generic/webFeed/WebFeedGatewayPlugin.php:71
```

## Cause

`WebFeedGatewayPlugin::fetch()` (pkp/webFeed, `WebFeedGatewayPlugin.php`,
lines 68–72) takes the feed name from the address and, when it is not a
key of `FEED_MIME_TYPE` (`atom`, `rss`, `rss2`), throws a plain
`Exception('Invalid feed format')`. A missing name is `null` and takes
the same branch; the comparison is case-sensitive.
`PKPApplication::execute()` catches every `Throwable`, reports it and
throws it again, so the request ends as a 500 with an empty body.

The rule the code breaks: an address that points at nothing that exists
is answered with a 404. The gateway's own handler does that one step
earlier, for an unknown plugin name: `GatewayHandler::__construct()`
throws `NotFoundHttpException`. The same `execute()` has a catch for
that class (`PKPApplication.php`, line 377) which prints "404 Not
Found", and a throw inside `fetch()` reaches it too.

On 3.3 the plugin answered `return false` for an unknown feed name,
and `GatewayHandler::plugin()` then redirected to the journal's home
page. The rewrite of `fetch()` for the feeds' sections, categories and
keywords replaced the type maps with a `match` whose `default` arm
throws (OPS 08f5923593, 2022; OJS b9d9cdb8c4, 2023). The shared
pkp/webFeed plugin kept the throw but wrote it as today's `in_array`
check
([e2bb67cd4e](https://github.com/pkp/webFeed/commit/e2bb67cd4e9f4854829411c009ecfab0f84b952d)),
so the file has no `match`.

Reach:

- The journal's, press's and preprint server's feed address, for any
  feed name outside the three and for none (walked).
- A longer address, such as `…/WebFeedGatewayPlugin/atom/extra`, does
  not fail: only the first part after the plugin's name is read, and the
  Atom feed shows (walked).
- The site-wide address `/index.php/index/gateway/plugin/WebFeedGatewayPlugin/…`
  does not fail: `fetch()` returns `false` before the check when there is
  no journal (read in the code).
- The only other gateway plugin the apps ship, OJS's
  `AnnouncementFeedGatewayPlugin`, still answers `return false` for an
  unknown feed name, so its address lands on the home page (read in the
  code).

## Proposed fix

Answer the unknown feed name with a 404, the way the gateway handler
answers an unknown plugin name. In pkp/webFeed,
`WebFeedGatewayPlugin::fetch()`:

```diff
-use Exception;
+use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
@@ public function fetch($args, $request): bool
         $feedType = array_shift($args);
         if (!in_array($feedType, array_keys(static::FEED_MIME_TYPE))) {
-            throw new Exception('Invalid feed format');
+            throw new NotFoundHttpException();
         }
```

The full diff, relative to the app root:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unknown-feed-name-blank-page/fix.diff)
(in a pkp/webFeed checkout, `git apply -p4`).

Tried on `main` on the three apps. With the fix, steps 2 to 5 showed
"404 Not Found" (status 404), the same page as step 6. What the fix must
leave alone behaved the same with the fix in and out: the Atom, RSS 2.0
and RSS 1.0 feeds with their content types and items, `…/atom/extra`,
the gateway address alone (the home page) and the unknown plugin name
(404).

**Alternatives**

- `return false`, as on 3.3 and as `AnnouncementFeedGatewayPlugin` does:
  the address then redirects to the home page. A feed reader given a
  wrong address would receive an HTML page with status 200 and report a
  broken feed, where a 404 says the address is wrong.
- Accept the name in any letter case, or with an extension. That is a
  new feature, and still leaves the other names and the missing one to
  answer.

**What goes with it**

- No stored data, REST API or plugin hook changes. `use Exception` has
  no other use in the file and goes.
- Backport: the change goes to pkp/webFeed's own `stable-3_5_0` and
  `stable-3_4_0` branches, not to the apps. 3.5 has the same file and
  the same catch in `PKPApplication::execute()`, so the diff applies as
  it stands (not tried there). 3.4 has no such catch: the handler calls
  `$request->getDispatcher()->handle404()`, which ends the request
  itself, so the plugin calls it in place of the throw and needs no
  `return` after it.
- `AnnouncementFeedGatewayPlugin` could take the same 404 for
  consistency; it does not fail today, so it is left out.
- Guard: a request for an unknown feed name in the plugin's own Cypress
  test (`cypress/tests/functional/WebFeed.cy.js`; its `cy.request` needs
  `failOnStatusCode: false` for a 404), or an e2e scenario in
  spec U18 that asserts "404 Not Found" once fixed (a **Planned** item).

Small: two lines in one file of the plugin, following the gateway
handler's own pattern.

## Evidence

- The kept script walks the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unknown-feed-name-blank-page/walk.js);
  with `neighbour` as its argument it walks what the fix must leave
  alone. On an install freshly loaded from the default dataset, from a
  pkp-e2e checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/unknown-feed-name-blank-page/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/unknown-feed-name-blank-page/fix.diff ojs omp ops`.
- Walked on PostgreSQL, datasets pkp/datasets e8dafbc (2026-10-02); the
  fault does not depend on the database.
- Walked on main and 3.5, the three apps, signed out; 3.5 showed the
  same 500s with the same log line. Each address was also read as a plain request
  beside the page visit, with the same status. Not driven here: the fix
  on 3.5; `display_errors = On`, where PHP would print the error text
  on the page; a signed-in user; the site-wide address; the plugin
  turned off.
- Code reads. main and 3.5: `WebFeedGatewayPlugin::fetch()`, each app's
  `GatewayHandler::__construct()` and `plugin()`, and
  `AnnouncementFeedGatewayPlugin::fetch()` (OJS),
  `PKPApplication::execute()` and the plugin's `settings.xml` (`enabled`
  is `true` for a new context); a search for classes
  extending `GatewayPlugin` found these two only. 3.4: the three apps'
  `stable-3_4_0` point the plugin at pkp/webFeed d786885, whose
  `fetch()` has the same throw at line 68, and `Dispatcher::handle404()` there
  sends the 404 header and calls `fatalError()`, which exits; how 3.4
  shows the uncaught exception was not walked. 3.3 (`git show upstream/stable-3_3_0:plugins/generic/webFeed/WebFeedGatewayPlugin.inc.php`,
  the three apps): `fetch()` answers `return false` for a feed name
  outside its type map, and `GatewayHandler::plugin()` redirects to
  `index`.
- Introduced: `git blame` on the throw in pkp/webFeed gives e2bb67cd4e
  ("pkp/pkp-lib#8770 Initial commit", 2023-03-14), which moved the
  plugin out of the apps. `git log -S"Invalid feed format"` in the apps
  finds the commits that added it in-tree: OPS 08f5923593 (PR
  `pkp/ops#351`, merged 2022-10-06) and OJS b9d9cdb8c4 (PR
  `pkp/ojs#3821`, merged 2023-03-10); OMP's in-tree plugin never had it.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/webFeed): "Invalid feed format", feed blank page
  500, gateway plugin exception 404 feed, `WebFeedGatewayPlugin`. Read
  and not the same fault: `pkp/pkp-lib#8731` (closed; a fatal error in
  the feed's template), `pkp/pkp-lib#2667` (closed; OMP's feed address
  redirecting home).
- Tips: OJS `main` b84f8e2e44 with lib/pkp ddd8ab243a; OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7, both with lib/pkp 3dc90c81a6;
  webFeed 7436935 in all three. `stable-3_5_0`: OJS 091fb65453, OMP
  9c5e24246, OPS 38b61882d3, each with lib/pkp cf3f984335 and webFeed
  cd16aa3. `stable-3_4_0`: OJS 75cc2d488b, OMP 0aec65441f, OPS
  acd8ae704b. `stable-3_3_0`: OJS ac77c9fb35, OMP 8e72fc8836, OPS
  c5532e2161.
