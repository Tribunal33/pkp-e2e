# A removed journal or site style sheet stops loading but stays online at its old address

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#3931` for `pkp/pkp-lib#3594` · [5f3be929e6](https://github.com/pkp/pkp-lib/commit/5f3be929e69f428774dfd0237f666c356859e2b3) · 2018-10-23 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U10 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a5), spec U60 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U60-site-settings.md#a6)
- **Checked** 2026-10-06, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

**Update 2026-10-06.** The Summary no longer says that only style
sheets are left behind: a removed thumbnail of a journal, press or
server stays online too, a separate fault tracked as [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a20).

## Summary

A manager who presses "Remove" under "Journal style sheet" and saves,
or a Site Administrator who does the same under "Site style sheet" in
Site Settings, expects the file to be gone. The public pages stop
loading it, but the file stays in the journal's or the site's public
files and still opens at its old address, for anyone, signed in or not.
Nothing on the site links to it any more, so it is reached through an
old saved copy of a page, a search index, or by someone who knows the
address.

Nothing on screen shows that the file is still there, and no screen can
delete it. It matters when the file held something the journal or the
site meant to withdraw.

The thumbnail of a journal, press or server is left behind too, by a
separate fault tracked as [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a20)
and outside this report. A removed "Logo", "Homepage Image" or
"Favicon", and the site's "Logo", are deleted as they should be.

## Impact

- **Lost:** no content, and no page breaks. The harm is exposure: the
  removed file stays public at a fixed address that anyone can work
  out (`/public/journals/<id>/styleSheet.css`; a press's under
  `/public/presses/<id>/`, a server's under `/public/contexts/<id>/`,
  the site's at `/public/site/styleSheet.css`).
- **Who:** a manager of a journal, press or server who removes its
  style sheet, and the Site Administrator for the site's. Removing a
  style sheet is rare.
- **Way round:** upload a blank style sheet, save, then remove it: the
  blank file overwrites the old one and is what stays behind. This
  works the same under Site Settings, since every upload of the site's
  sheet is written to the same `styleSheet.css` (by the code).

Low: every page is right, nothing is lost, and what stays behind is a
style sheet, a file of page styling rather than content.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. It has no style sheet and no favicon.
- On your computer: `u10c-style.css` holding `h2 { color: red; }`, and
  any small PNG, `u10c-favicon.png` (the control).
- For the site's style sheet: `u60d-site.css` holding
  `h2 { color: red; }`, and any small PNG, `u60d-logo.png` (the
  control). The dataset holds one journal (press, server), and Site
  Settings shows its "Appearance" tab only when the site holds a number
  of journals other than one, so step 2 of that group creates a second
  one.

A journal's style sheet:

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

The site's style sheet:

1. Sign in as `admin` (password `admin`), the Site Administrator.
2. Go to Administration › "Hosted Journals" [OMP: "Hosted Presses";
   OPS: "Hosted Servers"] and press "Create Journal" [OMP: "Create
   Press"; OPS: "Create Server"]. Fill in the name "u60d Journal",
   initials "u60d", contact "u60d Journal" and `u60d@mailinator.com`,
   country "Canada", path `u60d`, tick English as the language and the
   primary one, tick that it appears publicly, and press "Save".
3. Go to Administration › "Site Settings", open the "Appearance" tab,
   then its "Setup" tab.
4. Under "Site style sheet", press "Upload File" and choose
   `u60d-site.css`. Under "Logo", press "Upload File" and choose
   `u60d-logo.png`. Press "Save".
5. Reload the page and open "Appearance" › "Setup" again. The style
   sheet box shows "styleSheet.css" as a link. Note its address
   (`…/public/site/styleSheet.css`) and the logo picture's
   (`…/public/site/pageHeaderTitleImage_en.png`).
6. Press "Remove" under "Site style sheet" and "Remove" under "Logo",
   then "Save".
7. Sign out and open the site's home page (`/index.php/index`). Its
   page head no longer links the style sheet [OMP: it never did, since
   a press's site does not load its style sheet, `pkp/pkp-lib#12753`].
8. Open the style sheet address noted in step 5, then the logo's.

**Expected:** both addresses answer "404 Not Found".

**Observed:** the style sheet address answers 200 with the removed
file:

```
h2 { color: red; }
```

The logo address answers "404 Not Found". After step 6 the "Site style
sheet" box is empty ("Drop files here to upload", "Upload File"), and
the save answers 200 with "Saved".

## Cause

`PKPContextService::_saveFileParam()` in pkp-lib
(`classes/services/PKPContextService.php`, line 872; the clean-up
branch below is at line 877) deletes the stored file when a form sends `null` for an upload field. "Remove" and
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
languages, so the calls that save it, in `PKPContextService::edit()`
(line 675) and `PKPSiteService::edit()` (line 223), pass no locale and
`$localeKey` keeps its default `''`. (A third call, in
`PKPContextService::add()`, can never run: the `$params` it reads hold
only the pictures.)
`DataObject::getData()` treats only `null` as "no locale" and looks
`''` up as a locale key, so `getData('styleSheet', '')` returns `null`
and nothing is deleted. The method then returns `null`, which clears
the setting.

A second fault sits behind the first. The non-picture branch takes
`$setting` itself as the file name, but since `pkp/pkp-lib#5429`
(fdd87f7b5d, 2020-01-24) a context's style sheet is stored as an
object (`name`, `uploadName`, `dateUploaded`), like the pictures; the
site's is stored as an object too (`originalFilename`, `uploadName`,
`dateUploaded`). With only
the lookup fixed, `removeContextFile()` would get that whole object as
the file name, build a path ending in "Array", find no such file and
delete nothing. Both lines must change.

`PKPSiteService::_saveFileParam()` (`classes/services/PKPSiteService.php`,
line 309; its clean-up branch at line 314) has the same clean-up branch
for the site's style sheet, calling `removeSiteFile()`.

Reach:

- The journal's, press's and server's style sheet, and the site's
  "Site style sheet": on screen.
- "Logo", "Homepage Image", "Favicon" and the site's "Logo" pass a
  locale and read `uploadName`: checked in the code, and the favicon
  and the site's "Logo" on screen.
- The journal's, press's and server's thumbnail is left behind too, by
  a separate fault this fix does not reach
  ([A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a20)). `PKPContextService::edit()` calls the
  `Context::edit` hook before `updateObject()`, so each app's
  `ContextService::afterEditContext()` gets the new context: not yet
  saved, but merged with the submitted values, so its thumbnail is
  already `null` and `_saveFileParam()` finds nothing to delete.
  Passing `$currentContext` (`$args[1]`) to `_saveFileParam()` there
  is A20's one-line fix, outside this one. Checked in the code, and on
  screen.
- Publication cover images (`publication\Repository::_saveFileParam()`)
  already read `$oldValue['uploadName'] ?? null` and always pass a
  locale: not affected, checked in the code.
- Stored data: each context whose style sheet was removed keeps an
  orphaned `styleSheet.css` in its public folder, and a site whose
  style sheet was removed keeps `public/site/styleSheet.css`.

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

Tried on all three apps, for a journal's style sheet and the site's:
with the diff applied, both groups of Steps end with the style sheet
address answering "404 Not Found", and the favicon's and the logo's
still do.

The fix also deletes nothing it should keep. Two cases were checked
on both style sheets, with the diff applied and without it, with the
same result each time:

- A style sheet uploaded and saved is still served after a second
  "Save" that leaves it untouched.
- "Remove" and "Upload File" with a second style sheet in one save:
  the address serves the second file.

**Alternatives:**

- Change `_saveFileParam()`'s `$localeKey` default from `''` to `null`:
  it fixes the lookup, but the `$isImage` switch would still pass the
  stored object as the file name, so it must change anyway.
- Make `DataObject::getData()` treat `''` as no locale: it changes a
  core accessor every entity uses.

**What goes with it:**

- Stored data: no repair proposed. An upgrade step could delete
  `styleSheet.css` from each context's public folder where its
  `styleSheet` setting is empty, and `public/site/styleSheet.css`
  where the site's is; the team may want one if any install removed a
  style sheet to withdraw its content.
- Backport: the diff applies as written to `stable-3_5_0`. On 3.4 and
  3.3 the same lines sit in `PKPContextService` and `PKPSiteService`
  (`.inc.php` on 3.3), so the change ports by hand.
- Test: an end-to-end check that opens the old address after the
  removal and expects 404, proposed as a Planned item in pkp-e2e's
  appearance spec.

Small: three lines in each of two methods of one repo, with no data
repair.

## Evidence

- The scripts that take the Steps through the browser on a freshly
  loaded default dataset, in pkp-e2e's own harness:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/removed-style-sheet-stays-public/walk.js)
  runs the journal's Steps, and
  [site-walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/removed-style-sheet-stays-public/site-walk.js)
  the site's (`node bin/probe.js all <script>`). Run with `WALK=nb`
  in front, each runs instead the check that the fix deletes nothing it
  should keep (the two cases under Proposed fix); `WALK=thumb` in front
  of walk.js uploads, removes and opens the journal thumbnail instead
  (the Summary's thumbnail sentence).
- Walked on OJS, OMP and OPS: on `main`, both groups of Steps without
  the fix and with it, and the keep check with and without it
  (2026-10-03 and 2026-10-04, on the tips then: OJS ff004d0973, lib/pkp
  987776cd04; OMP 3b0ecf794c and OPS c8af945bb7, lib/pkp 3dc90c81a6;
  `_saveFileParam()` has not changed since); on `stable-3_5_0`, both
  groups of Steps. Walked again on 2026-10-06 on today's tips, without
  the fix: both groups of Steps on `main` and `stable-3_5_0`, with the
  same result, and the thumbnail on `main` (its address answered 200
  `image/png` after "Remove" and "Save", the box empty after a reload).
  PostgreSQL, pkp/datasets 5a53d3d (2026-10-05). No request failed on the server
  and no page script failed. The save request was read once on OJS
  `main`: a form post holding `styleSheet=`. Each site save also logged
  `PHP Warning: Undefined array key "redirectContextId"`, a separate
  fault reported as pkp-e2e#885
  (https://github.com/jardakotesovec/pkp-e2e/issues/885), which does
  not affect the style sheet.
- Not driven: 3.4 and 3.3.
- Tips:
  - **`main`:** OJS 1f4cef786f and OPS 21e41026b2 (lib/pkp
    a7f5e3081b), OMP 592914b831 (lib/pkp e39fdee199).
    `_saveFileParam()` is the same in both pkp-lib commits.
  - **`stable-3_5_0`:** OJS 4342473090 (lib/pkp 771474347e), OMP
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
  condition); `PKPTemplateManager` (a context's style sheet link) and
  each app's `TemplateManager` (the site's link: OJS line 65, OPS line
  57; OMP's adds none);
  `publication\Repository::_saveFileParam()`; each app's
  `ContextService::afterEditContext()` (the thumbnail, 2026-10-06);
  every caller of
  `removeContextFile()` and `removeSiteFile()`. On 3.4 and 3.3,
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
  and `removeSiteFile`, and again for the site's sheet. The nearest hits are other faults:
  `pkp/pkp-lib#12753` (a press's style sheet linked twice, and the
  site's never loaded on a press),
  `pkp/pkp-lib#6436` (the site's style sheet loaded on every journal,
  as designed),
  `pkp/pkp-lib#7756` (a style sheet's MIME type),
  `pkp/pkp-lib#6793` (a re-uploaded style sheet cached).
