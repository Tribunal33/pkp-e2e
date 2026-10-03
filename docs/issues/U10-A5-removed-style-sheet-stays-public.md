# A style sheet a manager removes stops loading but stays online at its old address

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#3931` for `pkp/pkp-lib#3594` · [5f3be929e6](https://github.com/pkp/pkp-lib/commit/5f3be929e69f428774dfd0237f666c356859e2b3) · 2018-10-23 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U10 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a5)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A manager who presses "Remove" under "Journal style sheet" and saves
expects the file to be gone. The public pages stop loading it, but the
file stays in the journal's public files and still opens at its old
address, for anyone, signed in or not. Nothing on the site links to it
any more, so it is reached through an old saved copy of a page, a
search index, or by someone who knows the address.

Nothing on screen shows that the file is still there, and no screen can
delete it. It matters when the file held something the journal meant
to withdraw.

Only style sheets are left behind: a removed "Logo", "Homepage
Image", "Favicon" or site header image is deleted as it should be. The
site's own style sheet, under Administration › Site Settings, is left
behind in the same way.

## Impact

- **Lost:** no content, and no page breaks. The harm is exposure: the
  removed file stays public at a fixed address that anyone can work
  out (`/public/journals/<id>/styleSheet.css`; a press's under
  `/public/presses/<id>/`, a server's under `/public/contexts/<id>/`,
  the site's under `/public/site/`).
- **Who:** a manager of a journal, press or server who removes its
  style sheet, and the site administrator for the site's. Removing a
  style sheet is rare.
- **Way round:** upload a blank style sheet, save, then remove it: the
  blank file overwrites the old one and is what stays behind. Deleting
  the file takes access to the server.

Low: every page is right, and what stays behind is a style sheet,
which seldom holds anything to withdraw. It would be medium if style
sheets often held content a journal must take down.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. It has no style sheet and no favicon.
- On your computer: `u10c-style.css` holding `h2 { color: red; }`, and
  any small PNG, `u10c-favicon.png` (the control).

1. Sign in as `rvaca` (password `rvacarvaca`), the Journal manager
   [OMP: Press manager; OPS: Preprint Server manager].
2. Go to Settings › Website, open the "Appearance" tab, then its
   "Advanced" tab.
3. Under "Journal style sheet" [OMP: "Press style sheet"; OPS: "Server
   style sheet"], press "Upload File" and choose `u10c-style.css`.
   Under "Favicon", press "Upload File" and choose `u10c-favicon.png`.
   Press "Save".
4. Reload the page and open "Appearance" › "Advanced" again. The style
   sheet box shows "styleSheet.css" as a link. Note its address
   (`…/public/journals/1/styleSheet.css`; OMP `…/public/presses/1/…`,
   OPS `…/public/contexts/1/…`) and the favicon picture's
   (`…/favicon_en.png`).
5. Press "Remove" under the style sheet box and "Remove" under
   "Favicon", then "Save".
6. Sign out and open the home page. Its page head no longer links the
   style sheet.
7. Open the style sheet address noted in step 4, then the favicon's.

**Expected:** both addresses answer "404 Not Found": a removed file is
gone.

**Observed:** the style sheet address answers 200 with the removed
file:

```
h2 { color: red; }
```

The favicon address answers "404 Not Found". After step 5 the style
sheet box is empty ("Drop files here to upload", "Upload File"), and
the save answers 200.

## Cause

`PKPContextService::_saveFileParam()` in pkp-lib
(`classes/services/PKPContextService.php`, from line 877) deletes the
stored file when a form sends `null` for an upload field. "Remove" and
"Save" send `styleSheet=` (empty), which
`PKPBaseController::_convertStringsToSchema()` turns into `null`, so
the method takes its clean-up branch:

```php
if (is_null($value)) {
    $setting = $context->getData($settingName, $localeKey);
    if ($setting) {
        $fileName = $isImage ? $setting['uploadName'] : $setting;
        $publicFileManager = new PublicFileManager();
        $publicFileManager->removeContextFile($context->getId(), $fileName);
    }
    return null;
}
```

The style sheet is the only upload field with one file for all
languages, so its calls (in `add()`, `edit()` and the site's `edit()`)
pass no locale and `$localeKey` keeps its default `''`.
`DataObject::getData()` treats only `null` as "no locale" and looks
`''` up as a locale key, so `getData('styleSheet', '')` returns `null`
and nothing is deleted. The method then returns `null`, which clears
the setting.

A second fault sits behind the first. The non-picture branch takes
`$setting` itself as the file name, but since `pkp/pkp-lib#5429`
(fdd87f7b5d, 2020-01-24) the style sheet is stored as an object
(`name`, `uploadName`, `dateUploaded`), like the pictures. With only
the lookup fixed, `removeContextFile()` would get that whole object as
the file name, build a path ending in "Array", find no such file and
delete nothing. Both lines must change.

`PKPSiteService::_saveFileParam()` (`classes/services/PKPSiteService.php`,
from line 314) is the same code for the site's style sheet.

Reach:

- The journal's, press's and server's style sheet: on screen.
- The site's "Site style sheet" (Administration › Site Settings ›
  "Appearance", shown once the site holds more than one context):
  checked in the code.
- "Logo", "Homepage Image", "Favicon" and the site's header image pass
  a locale and read `uploadName`: checked in the code, and the favicon
  on screen.
- Publication cover images (`publication\Repository::_saveFileParam()`)
  already read `$oldValue['uploadName'] ?? null` and always pass a
  locale: not affected, checked in the code.
- Stored data: each context whose style sheet was removed keeps an
  orphaned `styleSheet.css` in its public folder.

## Proposed fix

Read the whole setting when no locale is given, and take `uploadName`
for every kind of upload, in both services. The patch below is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/removed-style-sheet-stays-public/fix.diff)
as it stands. Its paths start at the app root (`a/lib/pkp/…`): apply it
there with `patch -p1`, or inside pkp-lib with `git apply -p3`.

```diff
--- a/lib/pkp/classes/services/PKPContextService.php
+++ b/lib/pkp/classes/services/PKPContextService.php
@@ -875,9 +875,9 @@
 
         // If the value is null, clean up any existing file in the system
         if (is_null($value)) {
-            $setting = $context->getData($settingName, $localeKey);
-            if ($setting) {
-                $fileName = $isImage ? $setting['uploadName'] : $setting;
+            $setting = $localeKey ? $context->getData($settingName, $localeKey) : $context->getData($settingName);
+            $fileName = $setting['uploadName'] ?? null;
+            if ($fileName) {
                 $publicFileManager = new PublicFileManager();
                 $publicFileManager->removeContextFile($context->getId(), $fileName);
             }
--- a/lib/pkp/classes/services/PKPSiteService.php
+++ b/lib/pkp/classes/services/PKPSiteService.php
@@ -312,9 +312,9 @@
 
         // If the value is null, clean up any existing file in the system
         if (is_null($value)) {
-            $setting = $site->getData($settingName, $localeKey);
-            if ($setting) {
-                $fileName = $isImage ? $setting['uploadName'] : $setting;
+            $setting = $localeKey ? $site->getData($settingName, $localeKey) : $site->getData($settingName);
+            $fileName = $setting['uploadName'] ?? null;
+            if ($fileName) {
                 $publicFileManager = new PublicFileManager();
                 $publicFileManager->removeSiteFile($fileName);
             }
```

Every upload has been stored as an object with `uploadName` since
2020, so the `$isImage` switch has nothing left to choose, and
`$setting['uploadName'] ?? null` is how `publication\Repository`
already reads its old cover image. A plain string value, should one
remain from before 3.2, gives `null` and is left alone rather than
raising an error.

Tried on all three apps: with the diff applied, the Steps' style sheet
address answers "404 Not Found" and the favicon's still does. A check
that the fix deletes nothing it should keep, run with the fix in and
out: a style sheet uploaded and saved was still served after a second
save that left it untouched, and after "Remove" and "Upload File" with
a second style sheet in one save, the address served the second
file.

**Alternatives:**

- Change `_saveFileParam()`'s `$localeKey` default from `''` to `null`:
  it fixes the lookup, but the `$isImage` switch must change anyway,
  and `moveTemporaryFile()`, which takes the same argument, would still
  default it to `''`, so the two would disagree.
- Make `DataObject::getData()` treat `''` as no locale: it changes a
  core accessor every entity uses.

**What goes with it:**

- Stored data: no repair proposed. An upgrade step could delete
  `styleSheet.css` from each context's public folder where the setting
  is empty; the team may want one if any install removed a style sheet
  to withdraw its content.
- Backport: the diff applies as written to `stable-3_5_0`. On 3.4 and
  3.3 the same lines sit in `PKPContextService` and `PKPSiteService`
  (`.inc.php` on 3.3), so the change ports by hand.
- Test: an end-to-end check that opens the old address after the
  removal and expects 404, proposed as a Planned item in pkp-e2e's
  appearance spec.

Small: three lines in each of two methods of one repo, with no data
repair.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/removed-style-sheet-stays-public/walk.js)
  takes these Steps on a freshly loaded default dataset:
  `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js all shared/playwright/checks/issues/removed-style-sheet-stays-public/walk.js`.
  `WALK=nb` runs the Proposed fix's check of what it must keep.
- Walks: OJS, OMP and OPS on `main` (Steps, the trial, the neighbour
  with the fix in and out) and on `stable-3_5_0` (Steps), on
  PostgreSQL, datasets pkp/datasets 566bb1f (2026-10-03). No request
  failed on the server and no page script failed. The save request was
  read once on OJS `main`: a form post holding `styleSheet=`.
- Not driven: 3.4 and 3.3; the site's style sheet (the dataset holds
  one context, so the site's "Appearance" tab is not shown).
- Tips:
  - **`main`:** OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c
    and OPS c8af945bb7 (lib/pkp 3dc90c81a6). `_saveFileParam()` is the
    same in both pkp-lib commits.
  - **`stable-3_5_0`:** OJS c1cee76b95 (lib/pkp 771474347e), OMP
    9c5e24246c, OPS 38b61882d3 (lib/pkp cf3f984335).
  - **`stable-3_4_0`:** OJS d68934d0d1, OMP 0aec65441, OPS acd8ae704b,
    pkp-lib 767353f4fe.
  - **`stable-3_3_0`:** OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161,
    pkp-lib ac3fa73402.
- Code reads: on `main`, pkp-lib `PKPContextService::edit()`, `add()`,
  `_saveFileParam()` and `moveTemporaryFile()`;
  `PKPSiteService::edit()` and `_saveFileParam()`;
  `PKPContextController::edit()`;
  `PKPBaseController::_convertStringsToSchema()`;
  `PKPSchemaService::coerce()`; `DataObject::getData()`;
  `PKPPublicFileManager::removeContextFile()` and
  `FileManager::deleteByPath()`; `PKPAppearanceAdvancedForm`,
  `PKPSiteAppearanceForm` and `AdminHandler` (the site tab's
  condition); `PKPTemplateManager` (the page's style sheet link);
  `publication\Repository::_saveFileParam()`; every caller of
  `removeContextFile()` and `removeSiteFile()`. On 3.5, the two
  `_saveFileParam()` methods (the same lines). On 3.4 and 3.3,
  `PKPContextService` and `PKPSiteService` `_saveFileParam()` (the same
  lines; the non-picture branch stores an object),
  `DataObject::getData()` (`''` looked up as a locale on both),
  `APIHandler::_convertStringsToSchema()` (an empty string becomes
  `null` on both) and `PKPAppearanceAdvancedForm` (the same box).
- Introduced: `git blame` puts both lines on e3f570bc37 (2021, PSR-12
  formatting only); `git log -S` takes the `getData($settingName,
  $localeKey)` line and the `$isImage` switch to 5f3be929e6, the first
  version of the context forms, when the style sheet was stored as a
  plain file name and the lookup with `''` already returned nothing
  (`getData()` then, as on 3.3, returned a locale's value only from an
  array). So
  removal never deleted the file. fdd87f7b5d (`pkp/pkp-lib#5429` for
  `pkp/pkp-lib#5423`) later stored the style sheet as an object, which
  made the switch wrong too.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library for "stylesheet remove", "style sheet not deleted",
  "stylesheet delete file", "stylesheet removed still accessible",
  "public files not deleted", `_saveFileParam`, `removeContextFile`
  and `removeSiteFile`. The nearest hits are other faults:
  `pkp/pkp-lib#12753` (a press's style sheet linked twice),
  `pkp/pkp-lib#7756` (a style sheet's MIME type),
  `pkp/pkp-lib#6793` (a re-uploaded style sheet cached).
