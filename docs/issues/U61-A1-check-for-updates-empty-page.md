# "Check for updates" on System Information opens an empty page when the server cannot reach PKP's website

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#5978` for `pkp/pkp-lib#5963` · [fd98557035](https://github.com/pkp/pkp-lib/commit/fd985570357049a986aeb8d33652092fbe5b88e2) · 2020-06-09 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#10018` (closed; its fix covered the new-version notice only, and its last status comment lists this link as still failing on 3.3 and 3.4)
- **Tracked in** spec U61 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U61-system-administration.md#a1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On an installation that cannot reach PKP's website, a site administrator
who clicks "Check for updates" on Administration › System Information
gets an empty page: the application fails on the server. They expected
System Information again, with the latest release or a word that it
could not be found.

The browser's Back button returns to the full page, but the administrator
is never told that PKP's website was out of reach, so the empty page reads
as a broken installation. The new-release notice at the top of the
Administration and System Information pages meets the same failure and
quietly stays hidden.

The fix is short, but it spans four files in pkp-lib, changes what a
shared method returns on failure and adds a new warning text.

## Impact

- **Lost**: nothing stored. The administrator loses the site's System
  Information page for that click and learns neither the latest release
  nor why the check failed; the error goes only to the server's PHP error
  log. When the connection is refused the empty page comes at once; when a
  firewall silently drops the traffic, the request waits for libcurl's
  default connect timeout of about five minutes first, since the HTTP
  client sets none (code, not walked).
- **Who**: site administrators, on System Information, each time they
  click "Check for updates" while the server cannot reach pkp.sfu.ca:
  behind a firewall, without outbound access, or while PKP's website is
  down. Turning off `show_upgrade_warning` or `enable_beacon` in the
  configuration does not stop it.
- **Way round**: the browser's Back button; the rest of System
  Information works.

Low: on such a server the release check could not succeed anyway. It would be medium if
installations that do reach PKP's website met it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (OJS, OMP or OPS); the site
  administrator `admin`.
- The installation cannot reach pkp.sfu.ca. On a test install, set
  `http_proxy` and `https_proxy` under `[proxy]` in `config.inc.php` to an
  address where nothing answers (`"http://127.0.0.1:9"`). This stands in
  for a server without outbound access.

Steps:

1. Sign in as `admin` (password `admin`).
2. Open "Administration" (`/index.php/index/en/admin`).
3. Under the heading "System Information", click "View System Information".
4. On the page headed "System Information", click "Check for updates".

**Expected:** the page headed "System Information" opens again. It says
that the latest version could not be retrieved, offers "Check for
updates" to try again, and shows the rest of the page ("Version history",
"Server Information", the configuration table) as in step 3.

**Observed:** an empty page: no heading, no text, an empty tab title. The
request answered a server error with an empty body, and the PHP error log
reads (OMP and OPS name `omp-version.xml` and `ops-version.xml`):

```
GET /index.php/index/en/admin/systemInfo?versionCheck=1  →  500, empty body

PHP Fatal error:  Uncaught GuzzleHttp\Exception\ConnectException: cURL error 7: Failed to connect to 127.0.0.1 port 9 after 0 ms: Could not connect to server (see https://curl.se/libcurl/c/libcurl-errors.html) for https://pkp.sfu.ca/ojs/xml/ojs-version.xml?id=…&oai=… in …/lib/pkp/lib/vendor/guzzlehttp/guzzle/src/Handler/CurlFactory.php:1140
…
#20 lib/pkp/classes/site/VersionCheck.php(52): PKP\site\VersionCheck::parseVersionXML('https://pkp.sfu...')
#21 lib/pkp/pages/admin/AdminHandler.php(401): PKP\site\VersionCheck::getLatestVersion()
#22 [internal function]: PKP\pages\admin\AdminHandler->systemInfo(Array, Object(APP\core\Request))
```

Steps 2 and 3 open although, for each, the server first fetches the same
address for the new-release notice (`AdminHandler::initialize()`, with
`show_upgrade_warning` On): that check logs "Failed to retrieve the latest
version info: cURL error 7 …" and the page carries on.

## Cause

`AdminHandler::systemInfo()` (`lib/pkp/pages/admin/AdminHandler.php`,
line 401) calls `VersionCheck::getLatestVersion()` when the address
carries `versionCheck=1`. That goes through `parseVersionXML()` to
`FileManager::getStream()`, which fetches PKP's version descriptor with
Guzzle (`Application::getHttpClient()->request('GET', …)`). Guzzle throws
a `TransferException` (here a `ConnectException`) when the request
fails. Nothing between the handler and Guzzle catches it, so the request
ends in an uncaught exception, which answers 500 with an empty body.

The callers of `getLatestVersion()` were written for an empty answer on
failure: the template shows "Check for updates" again when
`$latestVersionInfo` is empty, and `UpgradeTool` prints "Failed to load
version info from …" when it is. That held while the fetch went through
`FileWrapper`, whose `HTTPFileWrapper::open()` returned false on a failed
connection. fd98557035 (`pkp/pkp-lib#5963`) replaced `FileWrapper` with
Guzzle, which throws instead, and the callers were not changed. In 2024,
`pkp/pkp-lib#9767` and `pkp/pkp-lib#10018` wrapped the one call in
`checkIfNewVersionExists()`, the new-release notice, in a `try … catch
(TransferException)`, and left this one.

Reach:

- `VersionCheck::checkIfNewVersionExists()`, the new-release notice on
  Administration and on a context's Settings pages: already catches the
  failure (Observed, steps 2 and 3).
- `UpgradeTool::check()`, `latest()` and `download()` (`php
  tools/upgrade.php check|latest|download`): the same uncaught exception
  (checked from the command line on OJS: `check` ends in "PHP Fatal
  error:  Uncaught GuzzleHttp\Exception\ConnectException …", exit 255,
  instead of its own "Failed to load version info from
  https://pkp.sfu.ca/ojs/xml/ojs-version.xml", exit 7).
- The Plugin Gallery's list is fetched by other code
  (`PluginGalleryGridHandler::loadData()`), which catches
  `TransferException` itself; not this fault (code).
- An answer that arrives but is not XML (a proxy's HTML page) throws from
  `new SimpleXMLElement()` in `parseVersionXML()`, not as a
  `TransferException`, and gives the same empty 500 (code; not walked).
- No timeout is set on the request (`PKPApplication::getHttpClient()`
  passes none, and Guzzle's default is none), so a firewall that drops
  traffic makes each fetch wait for libcurl's own connect timeout of 300
  s; a System Information click with the notice on fetches twice (code;
  not walked).

## Proposed fix

Catch the failure where the fetch is made, in
`VersionCheck::getLatestVersion()`, and return `null`, which its callers
already treat as a failure (`parseVersionXML()` declares `?array` but
never returns `null` today, so the `null` is new). Then
`checkIfNewVersionExists()` drops its own `try` and returns false on
`null`, `systemInfo()` marks a failed check, and `systemInfo.tpl` shows
a warning above "Check for updates", with one new English string
`admin.version.checkFailed` ("The latest version could not be retrieved
from PKP's website. Please try again later."). The catch and its log line
are the ones `checkIfNewVersionExists()` uses today, and
`<notification type="warning">` is the warning other templates use. The
heart of it:

```diff
-    public static function getLatestVersion(): array
+    public static function getLatestVersion(): ?array
 …
-        return self::parseVersionXML(
-            $application->getVersionDescriptorUrl() . …
-        );
+        try {
+            return self::parseVersionXML(
+                $application->getVersionDescriptorUrl() . …
+            );
+        } catch (\GuzzleHttp\Exception\TransferException $e) {
+            error_log('Failed to retrieve the latest version info: ' . $e->getMessage());
+            return null;
+        }
```

The whole change is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/check-for-updates-empty-page/fix.diff).
It was tried on `main` in the three apps. Step 4 then opened "System
Information" (200) with that warning above "Check for updates" and the
rest of the page unchanged. System Information opened without the check
(step 3) showed no warning, and `php tools/upgrade.php check` printed its
own "Failed to load version info from …" and exited 7.

The tried fix leaves two cases out on purpose, as follow-ups:

- **An answer that is not XML** (a proxy's or captive portal's HTML
  page) still gives the empty 500. Recommended: catch `\Exception`
  instead of `TransferException` in the same place, so a reply that
  cannot be parsed is treated as a failed check too (one word, not
  tried).
- **A firewall that drops traffic** still makes the click wait about five
  minutes before the new warning shows. Recommended as a separate change:
  a `connect_timeout` and `timeout` of a few seconds on this request,
  passed in `FileManager::getStream()` or `getLatestVersion()`. A
  default in `getHttpClient()` would also reach ORCID, DOI deposits and
  the other outbound calls, which needs its own decision.

**Alternatives:**

- A `try … catch` in `systemInfo()` alone, as `checkIfNewVersionExists()`
  has: it fixes the page but leaves the three `upgrade.php` commands
  failing, so it is a workaround.
- Catching in `FileManager::getStream()`: it would change every remote
  read made through it, beyond this fault.
- Returning `null` without a warning: the page would come back looking
  the same, with no sign that the check ran.
- Keeping the last good answer in the cache (suggested in
  `pkp/pkp-lib#10018`): useful on top, but it does not cover a first
  check.

**What goes with it:**

- `getLatestVersion()` is public: a plugin calling it now gets `null`
  instead of an exception. No plugin bundled with the three apps calls
  it.
- Backport: the diff applies to 3.5 as written. On 3.4 and 3.3,
  `systemInfo()` also runs `$latestVersionInfo['patch'] =
  VersionCheck::getPatch($latestVersionInfo);`, which must move inside
  the success branch. 3.3's `checkIfNewVersionExists()` catches
  `ConnectException` only (the `TransferException` widening of
  `pkp/pkp-lib#10018` was not backported there); the backport replaces
  that catch with the new one in `getLatestVersion()`, so 3.3 gets the
  `TransferException` catch too.
- Test: a pkp-lib unit test with the mocked Guzzle client `PKPTestCase`
  offers (`MOCKED_GUZZLE_CLIENT_NAME`) throwing a `ConnectException`,
  checking that `getLatestVersion()` returns `null`; and the walked steps
  as an e2e check in spec U61.

Medium: the code copies the notice check's catch, but it spans four
pkp-lib files (the shared method, the handler, the template and a new
English string) with a unit test, and it changes what a public method
gives a plugin on failure, which REPORT's "small" excludes.

## Evidence

- Kept script, which takes the Steps through the screens on a fresh load
  of the default dataset and records each page, its status and the
  server log; System Information without the check (step 3) is the page
  the fix must leave alone:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/check-for-updates-empty-page/walk.js),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/check-for-updates-empty-page/walk.js`.
- The fix was tried 2026-10-01 on the main tips below, and `php
  tools/upgrade.php check` was run in the OJS root with the fix out and
  in.
- Walked 2026-10-01 on PostgreSQL, each install loaded from
  pkp/datasets 38ab955 (2026-09-30), `<app>/main/pgsql` and
  `<app>/stable-3_5_0/pgsql`. main: OJS bade233f73 (lib/pkp
  2e377d27fc), OMP 3b0ecf794 and OPS c8af945bb7 (lib/pkp 3dc90c81a6).
  stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (lib/pkp
  a9c76aed62). Both lines showed the Observed above, with the same
  status. The fault involves no database query.
- 3.4, by code: OJS `stable-3_4_0` at 9571d8fde7, pkp-lib at
  df13621c2d. `pages/admin/AdminHandler.php` `systemInfo()` calls
  `getLatestVersion()` with no `try` (line 365); `parseVersionXML()`
  reads through `FileManager::getStream()` (Guzzle);
  `checkIfNewVersionExists()` catches `TransferException`.
- 3.3, by code: OJS `stable-3_3_0` at 9fdb9bcf9a, pkp-lib at
  d446601ebe. `pages/admin/AdminHandler.inc.php` `systemInfo()` calls
  `getLatestVersion()` with no `try` (line 334); the fetch goes through
  `XMLDAO::parseStruct()` to `PKPXMLParser::_getStream()`, a Guzzle
  request. On 3.4 and 3.3, OMP and OPS run the same pkp-lib files.
- Introduced: the throw comes from the fetch, so the trace follows it:
  `git log -S getHttpClient` on `classes/xml/XMLParser.inc.php` gives
  fd98557035, merged as `pkp/pkp-lib#5978` on 2020-06-10.
  b3664d2587 and 4c37b31ddb (`pkp/pkp-lib#6328`, 2021) later moved the
  fetch into `FileManager::getStream()` and `parseVersionXML()` onto
  `SimpleXMLElement`, keeping the throw.
- Configuration (code): `show_upgrade_warning` gates only the
  new-release notice, and `enable_beacon` Off only drops the site's
  identifier from the address fetched, so neither stops this link.
  `pkp/pkp-lib#7022` (2021, an offline install) was closed with the
  advice to turn both Off, which stops the notice's fetch but not this
  one.
- Upstream searched 2026-10-01 (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops,
  pkp/ui-library). Besides `pkp/pkp-lib#10018`, related and fixed:
  `pkp/pkp-lib#9767` and `pkp/pkp-lib#9028` (the new-release notice).
- Not driven: a firewall that drops traffic rather than refusing it, a
  descriptor answered with something other than XML, the new-release
  notice on a context's Settings pages, and the
  `upgrade.php` commands on OMP and OPS.
