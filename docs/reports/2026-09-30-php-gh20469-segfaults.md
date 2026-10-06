# On PHP 8.3, a press's category pages and editorial statistics sometimes get no answer from the server

Model: claude-opus-5-5.

Severity: medium · Effort: small · Defect · OMP · crash: server

Introduced: pkp-lib#11635 for pkp-lib#11589, commit d2d2bfa5ef (2025-06-30), by Bozana Bokan
(bozana), which typed `PKPPublication::getDAO(): DAO`; for the submission classes, pkp-lib#10072,
commit 657efbae75 (2024-06-17), by Alec Smecher (asmecher), which typed `DataObject::getDAO()` under
the existing `PKPSubmission::getDAO(): DAO` (2a34e57217, 2023). Both only expose a PHP engine bug
(php-src GH-20469); neither line is wrong in itself.

OMP at 3b0ecf794c, OJS at 7ce98ec09e, OPS at c8af945bb7 (lib/pkp 3dc90c81a6). stable-3_5_0: the
submission classes show it too at 8809a197de (lib/pkp); the publication classes do not. Tracked in
app-changes row 18 and ci-triage "A `php -S` worker segfault". Temporary: delete once acted on.

## Summary

On PHP 8.3 with OPcache, the server process crashes when a reader opens a press's category page, or
an editor opens Statistics › Editorial Activity, after the same PHP process has already served a
catalog, dashboard or settings page: the browser gets an empty answer ("didn't send any data").
Reloading works when the web server starts a fresh PHP process. The bug is in PHP (fixed in 8.4.23
and 8.5.8, never in 8.3), but PKP code decides whether it is reached, and OJS and OPS carry the same
two class families; a two-line change in pkp-lib keeps every request on the safe path.

## Impact

Readers browsing an OMP press by category, and editors reading the editorial statistics (and the
monthly statistics email the same code builds), get an error page or no figures instead, with no
message saying why. Whether it happens depends on what the same PHP process served before, so it
looks random: on PHP's built-in server it happens every time the steps below are followed; on a
production server one PHP worker serves many requests, and the PHP report this matches came from a
PHP-FPM production site. A reload helps once the crashed process has been replaced. OJS and OPS
contain the same two class families; today every one of their requests loads them in the safe order,
so they do not crash, but any new code that reaches the base class first would. Medium: a public
page and a statistics screen fail intermittently on a supported PHP version and a reload gets past
it; it would be high if the crash proves to repeat on every reload under PHP-FPM, which was not tried.

## Steps to reproduce

Preconditions:

- A fresh OMP install on PHP 8.3 (any 8.3.x) with OPcache enabled (`opcache.enable=1`, PHP's default
  for web servers), served by PHP's built-in web server, whose single process serves every request.
- A press "Public Knowledge Press" (path `publicknowledge`), and in it, Settings › Press ›
  "Categories" › "Add Category": name "Arts", path `arts`, "Save".

1. Start the server in the OMP directory: `php -S 127.0.0.1:8000`.
2. Open `http://127.0.0.1:8000/index.php/publicknowledge/catalog` (the "Catalog" link in the press's
   menu).
3. Click the category "Arts", or open
   `http://127.0.0.1:8000/index.php/publicknowledge/catalog/category/arts`.

**Expected.** The "Arts" category page.

**Observed.** No page. Chrome shows "This page isn't working. 127.0.0.1 didn't send any data.
ERR_EMPTY_RESPONSE". The server's terminal ends with

```
Segmentation fault (core dumped)
```

and `php -S` exits with status 139. Started again, the server shows the category page, until the
catalog is visited again first.

The same happens with the editorial statistics: sign in as the press manager, open the "Dashboard",
then "Statistics" › "Editorial Activity": the page's figures request
(`GET /index.php/publicknowledge/api/v1/stats/editorial?…`) gets no answer, and the process dies the
same way. Control: opening the category page first, before any catalog or dashboard page, works; so
does every step with `opcache.enable=0`, or on PHP 8.4.26.

## Cause

php-src GH-20469 ("unsafe inheritance cache replay with reentrant autoloading", fixed by commit
90569082bb, PR #22221, in 8.4.23 and 8.5.8). OPcache caches how a class was linked. When linking a
class needs another class loaded to check a return type ("delayed variance"), and loading that class
uses the first one before it is fully linked, PHP 8.3 still caches the half-finished result; a later
request in the same process that links the class from a different starting point replays that entry
and crashes in `instanceof_function_slow`.

PKP has two class families of exactly that shape (checked for every class of all three apps, and for
the library classes those requests load):

- `APP\publication\Publication extends PKP\publication\PKPPublication extends PKP\core\DataObject`.
  `PKPPublication::getDAO(): DAO` (PKPPublication.php:523) narrows `DataObject::getDAO():
  \PKP\db\DAO|\PKP\core\EntityDAO` (DataObject.php:437), so PHP must load `PKP\publication\DAO` to
  check it, and that DAO's `fromRow(): Publication` / `newDataObject(): Publication` (DAO.php:67, 159)
  need `APP\publication\Publication` again, whose parent is the half-linked `PKPPublication`.
- `APP\submission\Submission extends PKP\submission\PKPSubmission`, the same way through
  `PKPSubmission::getDAO(): DAO` (PKPSubmission.php:199), `APP\submission\DAO` and
  `PKP\submission\DAO`.

The rule, established for every order of these classes: a PHP process dies on the first request that
reaches the base class first (`PKPPublication`; `PKPSubmission` or `PKP\submission\DAO`) once any
earlier request in that process came in through the app class (`Publication`; `Submission` or
`APP\submission\DAO`). In OMP, the catalog, dashboards, settings pages and search come in through
`Publication`, while the category page (`PKPCatalogHandler::category()` →
`DatabaseEngine::buildQuery()`, DatabaseEngine.php:122) and the editorial statistics
(`PKPStatsEditorialQueryBuilder`) touch `PKPPublication::STATUS_PUBLISHED` first. OJS and OPS are safe
today only by accident of load order: `PKPTemplateManager::initialize()` registers `Submission` for
templates in every request (PKPTemplateManager.php:377), and the DataCite export plugin's registration
loads the publication DAO in every request (PubObjectsExportPlugin.php:1045). There are 116 references
to `PKPPublication::` and `PKPSubmission::` constants in lib/pkp and OMP, each a possible first touch.

## Proposed fix

A proposal; the team decides. Link both families through their app class at the very start of every
request, in `lib/pkp/includes/bootstrap.php` right after the Composer autoloader, so that no later code
can be the first to touch them:

```diff
 // Load Composer autoloader
 require_once 'lib/pkp/lib/vendor/autoload.php';
 
+// Work around https://github.com/php/php-src/issues/20469 (OPcache inheritance cache; fixed in
+// PHP 8.4.23 and 8.5.8, never in 8.3). APP\submission\Submission and APP\publication\Publication
+// extend a PKP class whose getDAO(): DAO can only be checked after loading a DAO whose own method
+// signatures name the APP class again. A request that links such a hierarchy from the APP class
+// leaves an inheritance-cache entry that crashes (SIGSEGV) the first later request in the same PHP
+// process that reaches the PKP class first (e.g. PKPPublication::STATUS_PUBLISHED). Linking both
+// hierarchies here, the same way in every request, keeps every request on the same path.
+class_exists(\APP\submission\Submission::class);
+class_exists(\APP\publication\Publication::class);
+
 define('BASE_SYS_DIR', dirname(INDEX_FILE_LOCATION));
```

- **Precedent.** pkp-lib 14a478bc53 (pkp-lib#8920) does exactly this in one handler
  (`SearchHandler::search()`: `$junk = \APP\publication\Publication::STATUS_PUBLISHED;`), and the same
  line guards `PKPSubmissionController` (:445), `PKPDoiController` (:575, :679),
  `PKPStatsPublicationController` (:181, :260) and OMP's `OAIHandler` (:53). Each protects its own
  handler and leaves every other first touch exposed; `bootstrap.php` is the one place every page,
  API and component request of all three apps passes before any of them. Those six lines become
  redundant and can go in the same change.
- **Every instance.** Only these two families have the shape; `SubmissionFile`, the context classes,
  `Issue`, `Chapter` and their DAOs also check return types late but never name a subclass, and no
  order of them crashes.
- **What it touches.** No behavior, API or hook changes; OJS and OPS already load both families in
  every request, OMP now does too (a few milliseconds at most). stable-3_5_0 needs only the
  `Submission` line, placed in `PKPApplication::__construct()` after `PKP_STRICT_MODE` is defined,
  because 3.5's class files read that constant when they load.
- **Alternatives.** Declaring `getDAO()` as `\PKP\core\EntityDAO` (with the precise type in a
  docblock) removes the late check itself, but gives up the typing and returns with the next
  `getDAO(): <own DAO>` on a class an app extends (not tried). Turning OPcache off, or file-cache-only
  mode, avoids it at a cost in speed and hides it. Requiring PHP 8.4.23 or later is the real fix.
- **Guard.** The e2e suites' OMP category-page and editorial-statistics scenarios crash without the
  fix on PHP 8.3; they currently re-open the page when the server drops the answer, which can go once
  the fix lands.

Small: two lines in one file (plus deleting six), following the code base's own workaround.

## Evidence

- Kept tools and results: `.reports/flake-0930/segv/` (diagnosis `diagnosis.md`, proposed diff
  `pkp-lib-gh20469-bootstrap.diff`, scripts in `tools/`). The fix was tried as an
  `auto_prepend_file` doing the two lines (`tools/preload.php`), which runs before `index.php` exactly
  where the lines would; the checkouts were not edited.
- Class-level: every ordered pair of classes that check a return type late (fresh `php -S` per pair,
  two requests): 5 crashing pairs of 2,550 (OMP), 1,980 (OJS), 1,560 (OPS), all in the two families;
  with the fix 0. Every triple of the 8 family members: 102 of 512 crash, the rule above predicts all
  512; with the fix 0. 6,320 pairs of the 80 classes (library ones included) that late-check in real
  requests: only the known 3.
- Pages: OMP catalog → category page, CI's PHP settings: crashed 5 of 5; OPcache off 5 of 5 fine;
  with the fix 5 of 5 fine. Dashboard → editorial statistics request: 5 of 5 crashed, OPcache off and
  with the fix 5 of 5 fine; JIT on or off makes no difference. The Playwright category scenario (U16
  S8) on the same server settings: 2 crashes per run, 0 with the fix. Walked on the campaign's test
  install (existing press and categories), not a fresh one, with the requests a browser sends
  (`tools/seq.py`) and through the screens (U16 S8); PHP 8.3.33 here, 8.3.35 on CI (no engine change
  between them).
- gdb backtrace of the crash (OJS, submission family): `trace/gdb-ojs-submission-pair.log`;
  `instanceof_function_slow ← zend_do_inheritance_ex ← zend_do_link_class`, register `rdi = 0x13`,
  the length of `"PKP\core\DataObject"` read as a pointer.
- CI: every 8.3.35 run of the suites logs 11-13 of these crashes on OMP (U16 category pages, U65
  editorial statistics), 24 of 24 complete runs read; the PHP 8.4.26 run 36692593423: none. Of ten
  other `php -S` deaths on CI (OJS, OMP, OPS, 2026-09-29/30), one is this bug; nine could not be tied
  to it or reproduced, and stay open in the diagnosis.
- Not tried: PHP-FPM (whether a crashed worker's replacement crashes again), stable-3_5_0 pages (only
  the class-level check), the type-change alternative.
