# The "Plugin Gallery" tab stays on "Loading" forever when the server cannot reach PKP's website

- **Severity** low
- **Effort** small
- **Kind** intention gap
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code; until a gallery list has been fetched once, with another error)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#7508` for `pkp/pkp-lib#5998` · [30fc760610](https://github.com/pkp/pkp-lib/commit/30fc760610e2475b26546d753491c6eb82561f7b) · 2021-11-30 · Henrique Ramos (henriqueramos)
- **Upstream** `pkp/pkp-lib#10036` (closed). Its fix catches the HTTP client's exception in the gallery's list, which works on 3.3; on 3.4 and later that exception no longer reaches the list, so the fix does nothing there
- **Tracked in** spec U62 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U62-plugins-management.md#a1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal manager or the site administrator opens "Plugins" and
presses "Plugin Gallery". When the server cannot connect to PKP's
website, the application fails on the server. The tab shows "Loading"
with a spinner that never ends, and no list or message. They expect an
empty list or a message that PKP's site cannot be reached.

"Installed Plugins" works as usual, and plugins can still be installed
from a downloaded package. But nobody is told that the gallery cannot be
reached, so the user may keep waiting or reloading. Settings › Website,
Site Settings and the Settings Wizard request the gallery's list as they
load, even when nobody presses "Plugin Gallery", so the server fails and
logs an error on every opening of these pages.

Every installation without outbound access to PKP's site meets it. During
an outage of PKP's site, an installation that normally reaches it meets
it too, once its cached copy of the list (kept for a day) has expired.

## Impact

- **Lost.** Nothing: even a working tab could not list plugins without
  access to PKP's site. The server log takes the failed fetch and a PHP
  fatal error, with its stack trace, on every load of these pages,
  whether or not the gallery tab is opened.
- **Who.** Journal managers and the site administrator on an
  installation behind a firewall or on a closed network, each time they
  open these pages.
- **Way round.** Plugins can still be installed from a downloaded package
  with "Upload A New Plugin", as they must be offline anyway.

The pages themselves are not slower: the list is a separate request made
after the page has loaded, and the rest of the page is usable while it
runs. Behind a firewall that drops the connection rather than refusing
it, that request waits for the 10-second timeout the gallery fetch sets
(`PluginGalleryDAO::DEFAULT_TIMEOUT`; the HTTP client sets none of its
own) before it fails, on every load, because a failed fetch is not
cached.

Low: the fault is the endless "Loading" in place of an empty list, and
an error in the server log on each opening; no page is held up and no
plugin is hidden that the installation could have installed. Nothing in
sight would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (OJS, OMP or OPS; the steps are the
  same in each, with "Presses" or "Servers" for "Journals").
- The server cannot connect to PKP's website. To stand in for a firewall
  or an outage, point the proxy in `config.inc.php` at a port where
  nothing listens:

  ```ini
  [proxy]
  http_proxy = "http://127.0.0.1:9"
  https_proxy = "http://127.0.0.1:9"
  ```

- The gallery's list has not been fetched in the last day. A freshly
  loaded dataset's cache is empty; on another install, press "Clear Data
  Caches" on the Administration page as `admin` first, which empties the
  cache that holds the list.

The journal manager:

1. On the journal's home page, press "Login" and sign in as `rvaca`.
2. In the side menu, open "Settings" and press "Website".
3. Press the "Plugins" tab.
4. Press the "Plugin Gallery" tab.

The site administrator, in the Settings Wizard:

5. Sign in as `admin`.
6. Open "Administration" (`/index.php/index/en/admin`) and press "Hosted
   Journals".
7. Press the arrow on "Journal of Public Knowledge" ("Public Knowledge
   Press" on OMP, "Public Knowledge Preprint Server" on OPS) and then
   "Settings wizard".
8. Press the "Plugins" tab, then "Plugin Gallery".

**Expected.** The "Plugin Gallery" tab shows its list with the category
drop-down, "Search", the columns "Name", "Description" and "Status",
and "No Items" (or a message that the gallery could not be reached).
"Installed Plugins" is as before.

**Observed.** At steps 4 and 8 the tab shows "Loading" with a spinner,
still there 10 seconds later, with no list and no message. The list was
requested when the page of step 2 (and of step 7) loaded, and it failed:

```
GET /index.php/publicknowledge/$$$call$$$/grid/plugins/plugin-gallery-grid/fetch-grid  →  500 (empty body)
```

The server log reads (OMP and OPS send their own application name in the
query):

```
cURL error 7: Failed to connect to pkp.sfu.ca port 443 via 127.0.0.1 after 0 ms: Could not connect to server (see https://curl.se/libcurl/c/libcurl-errors.html) for https://pkp.sfu.ca/ojs/xml/plugins.xml?application=ojs2&version=3.6.0.0
PHP Fatal error:  Uncaught ValueError: DOMDocument::loadXML(): Argument #1 ($source) must not be empty in lib/pkp/classes/plugins/PluginGalleryDAO.php:129
```

"Installed Plugins" lists the installation's plugins under their
category headings throughout.

## Cause

`PluginGalleryDAO::getExternalDocument()`
(`lib/pkp/classes/plugins/PluginGalleryDAO.php`) fetches `plugins.xml`,
catches every `Throwable`, logs the message and returns `null`.
`getCachedDocument()` passes that `null` through `Cache::remember()`, and
`_getDocument()` (line 129) hands it straight to
`DOMDocument::loadXML()`. Since PHP 8.0, `loadXML()` throws a
`ValueError` for an empty source. `PluginGalleryGridHandler::loadData()`
catches only `GuzzleHttp\Exception\TransferException`, so the
`ValueError` ends the request with a 500, and the grid's script never
replaces its "Loading" placeholder.

The `null` path came with `pkp/pkp-lib#5998` (30fc760610), which added
the cache and the 10-second timeout and made `getExternalDocument()`
swallow the failure so that a stalled request would not block the page.
In 2024, `pkp/pkp-lib#10036` asked for the gallery to survive a network
outage; its fix ([d806c08e90](https://github.com/pkp/pkp-lib/commit/d806c08e90bfbfbb9cdbf3d1c0efeffc4a20b9d6)
on `main`, [69fa07f193](https://github.com/pkp/pkp-lib/commit/69fa07f1933b0acb06fb7e3b11c71e5da928ab96)
on `stable-3_4_0`) put the `TransferException` catch in `loadData()`,
which the exception no longer reaches on these branches.

How often it shows depends on the cache. `pkp/pkp-lib#7111`
(9b81a3c3c9, 3.5) moved the cache to `Cache::remember()` for a day, and
a failed fetch stores nothing usable, so on 3.5 and `main` the failure
returns once the copy expires.

On 3.4, `getCachedDocument()` still uses `FileCache`, which keeps the
last good copy; a failed refresh does not replace it. So only an
installation that has never fetched the list (or whose cache was
cleared) fails, and it fails earlier than on `main`. The cache's
fallback closure calls `$this->getExternalDocument()` with no argument,
and the backport of `pkp/pkp-lib#12468`
([3de8242502](https://github.com/pkp/pkp-lib/commit/3de8242502c81821a15d52ac481a42b62e90cd95), 2026-03-18) made
that argument required. With no copy on disk, `getContents()` calls the
fallback, so the request ends there, before `_getDocument()`, and the
log reads (read in the code, not run):

```
PHP Fatal error:  Uncaught ArgumentCountError: Too few arguments to function PKP\plugins\PluginGalleryDAO::getExternalDocument(), 0 passed in lib/pkp/classes/plugins/PluginGalleryDAO.php on line 134 and exactly 1 expected
```

Reach:

- Every load of a page that holds the gallery: a context's Settings ›
  Website, Administration › Site Settings (on an installation with more
  than one context) and the Settings Wizard (walked: Settings › Website
  and the Settings Wizard, three apps).
- `PluginGalleryGridHandler::_getSpecifiedPlugin()`, behind a plugin's
  details and "Install", calls `getNewestCompatible()` with no catch.
  Offline, the list never shows, so these are out of reach. They fail
  the same way in one case: the list loaded from a cached copy, and the
  copy expired before the user pressed a plugin's name or "Install"
  (read in the code, not walked).
- The command-line `lib/pkp/tools/plugins.php list` and `info` call
  `getNewestCompatible()` too and stop with the same `ValueError` offline
  (read in the code, not run).
- No other code in pkp-lib or the three apps passes a fetched document
  that may be `null` to `loadXML()` (searched in the code).

## Proposed fix

Skip the parse in `PluginGalleryDAO::_getDocument()` when there is no
document, so an unreachable gallery lists no plugins. The diff, tried as
written on the three apps:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plugin-gallery-offline-stays-loading/fix.diff).

```diff
         $doc = new DOMDocument('1.0', 'utf-8');
-        $doc->loadXML($this->getCachedDocument($galleryUrl));
+        $xml = (string) $this->getCachedDocument($galleryUrl);
+        // An unreachable gallery (already logged by getExternalDocument()) lists no plugins.
+        if ($xml !== '') {
+            $doc->loadXML($xml);
+        }
```

This puts the check where the `null` is read, in the one method every
caller goes through: the list, the details and "Install", and the
command-line tool. It keeps the intent of `pkp/pkp-lib#5998` (a failed
fetch is logged and does not break the page). With several
`plugin_gallery_urls`, one unreachable address no longer hides the
others. It gives offline installations the empty list that 3.3's code
returns (read in the code, not walked). With the fix in, steps 4 and 8
showed the list with "Search", the three columns and "No Items" (200),
on the three apps. The "Installed Plugins" list's headings and rows read
the same with and without the fix.

**Alternatives**

- Let `getExternalDocument()` throw again, so the catch in `loadData()`
  from `pkp/pkp-lib#10036` takes effect. That works for the list, but one
  failing address then empties the whole gallery, the details, "Install"
  and the command-line tool still fail, and the timeout's protection
  from `pkp/pkp-lib#5998` has to be rebuilt around it.
- Tell the user that the gallery could not be reached, with a notice
  above the list. No sibling does this yet: the fix for the version
  check's same failure (`pkp/pkp-lib#10018`) logs it and shows nothing.
  The DAO would have to report the failure to the handler, a change to
  its return shape, and the wording is a product call. It can follow
  this fix.

**What goes with it**

- The `TransferException` catch in `loadData()` becomes dead code on 3.4
  and later; it can stay, or go with this change.
- Backport: 3.5 takes the diff as written. On 3.4, `_getDocument()`
  takes the same change, and `getCachedDocument()`'s fallback closure
  must also pass the address:
  `function (FileCache $cache) use ($galleryUrl) { $cache->setEntireCache($this->getExternalDocument($galleryUrl)); }`.
  Without it, the 3.4 request still fails, at the closure.
- Guard: a pkp-lib unit test in which `getExternalDocument()` returns
  `null` and `getNewestCompatible()` returns an empty list; and an
  end-to-end test that presses "Plugin Gallery" on an install that
  cannot reach PKP's site and expects "No Items".

Small: one guard in one shared method covers every caller, changes no
API, hook or stored data, and was tried as written on the three apps.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plugin-gallery-offline-stays-loading/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plugin-gallery-offline-stays-loading/lib.js):
  the Steps, both groups; it can also walk one group alone, or read only
  the "Installed Plugins" list for the with-and-without-fix comparison.
  Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/plugin-gallery-offline-stays-loading/walk.js`
  on an install freshly reset to the default dataset, whose config
  carries the dead-port `[proxy]` of the Preconditions.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  from pkp/datasets c657990 (2026-10-01).
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a), OMP 3b0ecf794 and OPS
  c8af945bb7 (pkp-lib 3dc90c81a6); `stable-3_5_0` OJS 091fb65453, OMP
  9c5e24246 and OPS 38b61882d3 (pkp-lib cf3f984335); `stable-3_4_0` OJS
  75cc2d488b, OMP 0aec65441, OPS acd8ae704b, pkp-lib 32b0f4b4af;
  `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161, pkp-lib
  f6ab331645.
- Code reads. On `main` and 3.5: `PluginGalleryDAO`,
  `PluginGalleryGridHandler`, `lib/pkp/tools/plugins.php`,
  `PKPApplication::getHttpClient()` (no timeout of its own) and
  `AdminHandler::clearDataCache()` (flushes the Laravel cache store that
  `Cache::remember()` uses); the three apps share this code through
  pkp-lib and override none of it. On 3.4: the same files,
  `GenericCache` and `FileCache` (`getContents()` calls the fallback
  when no copy is on disk). On 3.3: `PluginGalleryDAO.inc.php` (`_getDocument()`
  fetches with no catch) and `PluginGalleryGridHandler.inc.php`, whose
  `loadData()` catches the `TransferException` and returns an empty
  list.
- Introduced: `git blame` on line 129 gives 69f3066486
  (`pkp/pkp-lib#12468`, 2026), which only added the `$galleryUrl`
  argument; the call before it is 30fc760610's. Before 30fc760610 the
  failed fetch threw a Guzzle exception, which no code caught until
  `pkp/pkp-lib#10036`; so on `main` the tab never handled an outage, and
  the Kind is the gap left by `pkp/pkp-lib#10036`'s fix rather than a
  regression.
- Upstream, searched 2026-10-02 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library for "plugin gallery" with loading, offline, proxy,
  firewall and error, `PluginGalleryDAO`, `getCachedDocument`,
  `loadXML` "must not be empty" and `plugins.xml` timeout. Read:
  `pkp/pkp-lib#10036` (the Upstream bullet); `pkp/pkp-lib#10018` (the
  version check; a comment of 2024-06-08 reports that 3.4 shows a cached
  gallery during the outage); `pkp/pkp-lib#5998` and its PRs
  `pkp/pkp-lib#7508` and `pkp/ojs#3240` (the cache and timeout);
  `pkp/pkp-lib#9535` (the same `ValueError` in the PLN plugin, another
  fault). None reports this fault on 3.4 or later.
- Not driven: 3.4 and 3.3 (read in the code); a reachable gallery, since
  the test installs cannot reach PKP's site, so the fixed list with
  plugins in it was not seen; the gallery's own "Search" with the fix
  in; a firewall that drops the connection (the 10-second wait is read
  in the code); a plugin's details or "Install" after the copy expires; the
  command-line tool; Site Settings › "Plugins", which the dataset's one
  context does not offer.
