# "Check for updates" opens an empty page when the server cannot reach PKP's website

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#5978` for `pkp/pkp-lib#5963` · [fd98557035](https://github.com/pkp/pkp-lib/commit/fd985570357049a986aeb8d33652092fbe5b88e2) · 2020-06-09 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#10018` (closed). Its fix, `pkp/pkp-lib#10028`, covers only the newer-release notice, and a comment after the merge names "Check for updates" as still failing on 3.3 and 3.4
- **Tracked in** spec U61 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U61-system-administration.md#a1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

The site administrator presses "Check for updates" on Administration ›
"System Information". When the server cannot connect to PKP's website,
the application fails on the server. It opens an empty page, with no
heading, no text and no tab title. The administrator expects System
Information again, with word that the check could not be made.

Nothing is lost, and Back returns to a working System Information page.
The administrator is not told why the check failed, and pressing the
link again gives the same empty page.

The newer-release notice on Administration and its pages makes the same
request and handles the same failure quietly.

## Impact

- **Lost.** The administrator gets neither an answer nor a reason, and
  the whole System Information page is gone until Back.
- **Who.** The site administrator of a server without outbound access to
  pkp.sfu.ca (behind a firewall, on a closed network). During an outage
  of PKP's site, every install's check fails this way at once.
- **Way round.** The latest release can be read on PKP's download page by
  hand.

Low: the check cannot succeed offline whatever the page shows; the fault
is the empty page, and Back recovers. Nothing in sight would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (OJS, OMP or OPS; the steps are the
  same in each).
- The server cannot connect to PKP's website. To stand in for a firewall
  or an outage, point the proxy in `config.inc.php` at a port where
  nothing listens:

  ```ini
  [proxy]
  http_proxy = "http://127.0.0.1:9"
  https_proxy = "http://127.0.0.1:9"
  ```

  Everything else is as the dataset ships it, including `[debug]
  display_errors = Off` (with it On, the page of step 4 shows the fatal
  error's text instead of nothing; the 500 and the log line are the
  same) and `[general] show_upgrade_warning = On` (which makes the pages
  of steps 2 and 3 ask for the newer-release notice).

Steps:

1. Sign in as `admin`.
2. Open "Administration" from the user menu
   (`/index.php/index/en/admin`).
3. Press "View System Information".
4. Press "Check for updates".

**Expected.** The "System Information" page again, with a warning that
the latest version could not be retrieved, and the "Check for updates"
link still there to try again. The rest of the page (current version,
"Version history", "Server Information", the configuration table) is as
before.

**Observed.** An empty page: no heading, no text, and an empty tab
title. The request behind it fails:

```
GET /index.php/index/en/admin/systemInfo?versionCheck=1  →  500
```

The server log reads (OMP and OPS name their own version files):

```
PHP Fatal error:  Uncaught GuzzleHttp\Exception\ConnectException: cURL error 7: Failed to connect to 127.0.0.1 port 9 after 0 ms: Could not connect to server (see https://curl.se/libcurl/c/libcurl-errors.html) for https://pkp.sfu.ca/ojs/xml/ojs-version.xml?id=…
```

The pages of steps 2 and 3 open normally. Each makes the same request
for the newer-release notice; it fails the same way, and the server logs
it as "Failed to retrieve the latest version info: cURL error 7 …" and
shows no notice.

## Cause

`AdminHandler::systemInfo()` (`lib/pkp/pages/admin/AdminHandler.php`,
line 401) calls `VersionCheck::getLatestVersion()` with no `try` when
the request carries `versionCheck=1`. `getLatestVersion()` fetches the
version file through `VersionCheck::parseVersionXML()` →
`FileManager::getStream()` → `Application::getHttpClient()->request()`.
Guzzle throws a `TransferException` when the request fails. Nothing on
the way catches it, so the request ends in a fatal error.

`getLatestVersion()` has four callers: this one, the three of the
command-line `UpgradeTool` (Reach), and
`VersionCheck::checkIfNewVersionExists()`. That last one runs the
newer-release notice from `AdminHandler::initialize()` and
`ManagementHandler` (line 201, Settings › Journal) when
`show_upgrade_warning` is On. It catches `TransferException` at lines
158–163, logs it and carries on: a catch that came with
`pkp/pkp-lib#9767`, was widened in `pkp/pkp-lib#10028`, and never
reached `systemInfo()`.

The unguarded call in `systemInfo()` predates the failure: until
`pkp/pkp-lib#5963` (fd98557035) replaced PKP's own HTTP wrapper with
Guzzle, a failed fetch made the XML parser return `false` rather than
throw.

Reach:

- The command-line upgrade tool's `check`, `latest` and `download`
  (`UpgradeTool`, lines 77, 85 and 118) call `getLatestVersion()` with
  no `try` either, so offline they stop with the same uncaught exception.
  `download()` still tests for a falsy answer and prints "Failed to load
  version info from …", a branch that no failure reaches since the
  fetch began to throw (read in the code, not run).
- `getLatestVersion()` has no other caller in pkp-lib or in the three
  apps and their bundled plugins (checked in the code).
- A reply that arrives but is not XML (for example, an HTML page from a
  proxy) makes `new SimpleXMLElement()` in `parseVersionXML()` throw a
  plain `Exception`. Neither caller catches that (read in the code, not
  walked).

## Proposed fix

Catch the transfer failure in `AdminHandler::systemInfo()`, log it as
`checkIfNewVersionExists()` does, and show a warning above the "Check
for updates" link. The diff, tried as written on the three apps:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/check-for-updates-offline-empty-page/fix.diff).

```diff
-        if ($request->getUserVar('versionCheck')) {
-            $latestVersionInfo = VersionCheck::getLatestVersion();
-        } else {
-            $latestVersionInfo = null;
+        $latestVersionInfo = null;
+        $latestVersionCheckFailed = false;
+        if ($request->getUserVar('versionCheck')) {
+            try {
+                $latestVersionInfo = VersionCheck::getLatestVersion();
+            } catch (\GuzzleHttp\Exception\TransferException $e) {
+                error_log('Failed to retrieve the latest version info: ' . $e->getMessage());
+                $latestVersionCheckFailed = true;
+            }
         }
```

The handler assigns `latestVersionCheckFailed` to the template.
`templates/admin/systemInfo.tpl` prints
`<notification type="warning">{translate key="admin.version.checkFailed"}</notification>`
above the link when it is set. `locale/en/admin.po` adds
`admin.version.checkFailed` "The latest version could not be retrieved
from the PKP website. Please try again later."

This follows the sibling's pattern (the same catch and log line as
`checkIfNewVersionExists()`; `PluginGalleryGridHandler::loadData()`
catches the same exception). It puts the message in the page that owns
the link, and changes no method that a plugin might call. With the fix
in, step 4 opens "System Information" (200) with the warning, the link
and the whole page. A neighbour check (System Information without the
check, Administration, Hosted Journals, Site Settings) read the same
with and without the fix.

**Alternatives**

- Catch inside `VersionCheck::getLatestVersion()` and return `null`.
  This restores the answer `UpgradeTool::download()` still expects and
  covers every caller in one place. But it changes a public method's
  return type, and each caller must still test for `null` to say what
  went wrong, so it touches as many places as the catches do.
- Catch and show the link again with no message, as the Plugin Gallery
  does. This stops the server error, but the administrator presses a
  link that seems to do nothing.
- Cache the last good answer (suggested on `pkp/pkp-lib#10018`). This
  helps during an outage but not on a server that never had a
  connection, and it still needs this catch.

**What goes with it**

- The command-line tool in the Cause's reach is left out: it stops with
  the exception's own message, which tells the operator what failed. The
  same catch in `UpgradeTool::check()`, `latest()` and `download()`
  would bring back `download()`'s own message, if the team wants it.
- The non-XML reply in the Cause's reach is left out. It needs a wider
  catch in both callers and is a separate decision.
- Backport: 3.5 takes the diff as written. On 3.4, the `try` also wraps
  the `getPatch()` line that follows the call. On 3.3 the same change goes
  into `AdminHandler.inc.php`, catching `TransferException` as on main,
  not the `ConnectException` 3.3's own `checkIfNewVersionExists()`
  catches: a refused certificate (the outage of `pkp/pkp-lib#10018`)
  throws a `RequestException`, which `ConnectException` misses, and
  that is why `pkp/pkp-lib#10028` widened the catch on 3.4 and later.
- Guard: the e2e suite's test installs cannot reach PKP's site, so U61's
  System Information scenario can press "Check for updates" and expect
  the warning (a **Planned** item in the spec).

Small: a `try` in one handler, a line in its template and one new text,
following the catch the code already uses for the same call.

## Evidence

- Kept scripts:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/check-for-updates-offline-empty-page/walk.js)
  (the Steps, three apps) and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/check-for-updates-offline-empty-page/neighbour.js)
  (System Information without the check, Administration, Hosted
  Journals/Presses/Servers, Site Settings), with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/check-for-updates-offline-empty-page/lib.js).
  Run: `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/check-for-updates-offline-empty-page/walk.js`
  on an install freshly reset to the default dataset, whose config
  carries the dead-port `[proxy]` of the Preconditions. The fix was tried
  with `node bin/try-fix.js apply …/fix.diff ojs omp ops` and taken out
  again after the walk.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  from pkp/datasets c657990 (2026-10-01).
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a), OMP 3b0ecf794 and
  OPS c8af945bb7 (pkp-lib 3dc90c81a6); `stable-3_5_0` OJS c346ee00a5
  (pkp-lib 3bb4450bea), OMP c7b45f88e and OPS 8eaf899468 (pkp-lib
  1fb843f491); `stable-3_4_0` OJS 75cc2d488b, OMP 0aec65441, OPS
  acd8ae704b, pkp-lib 32b0f4b4af; `stable-3_3_0` OJS ac77c9fb35, OMP
  8e72fc883, OPS c5532e2161, pkp-lib f6ab331645.
- Code reads. On `main` and 3.5: `AdminHandler`, `ManagementHandler`,
  `UpgradeTool`, `VersionCheck`, `FileManager::getStream()` and
  `templates/admin/systemInfo.tpl`; the three apps share this code
  through pkp-lib and override none of it. On 3.4: the same files. On
  3.3: `AdminHandler.inc.php`, `VersionCheck.inc.php`, `XMLDAO` and
  `PKPXMLParser::_getStream()`.
- Introduced: `git blame` on line 401 gives e3f570bc37 (PSR-12
  formatting, 2021); the call is unchanged back to fd98557035's parent.
  Before that change, the page opened with a "Latest version" line
  holding no version (read in the code, not walked). So the check never
  reported the failure, and the Kind is defect, not regression.
- Upstream, searched 2026-10-02 in pkp/pkp-lib and pkp/ojs for "check
  for updates", `getLatestVersion`, `versionCheck`, `VersionCheck`
  exception, "version check" proxy and `ojs-version.xml`. Read:
  `pkp/pkp-lib#10018` (the Upstream bullet; jonasraoni's comment of
  2024-06-08 names `admin/systemInfo?versionCheck=1` as failing on 3.3
  and 3.4), and `pkp/pkp-lib#9767`, `pkp/pkp-lib#7022` and
  `pkp/pkp-lib#9028`. These three are the newer-release notice's
  failure on every Administration page, now fixed, and not this fault.
- Not driven: 3.4 and 3.3 (read in the code); an answered check, since
  the test installs cannot reach PKP's site. So "Latest version" and
  "Your system is up-to-date" were not seen, and neither was the fixed
  page after an answered check (which should show them and not the new
  warning). A non-XML reply was not driven either.
