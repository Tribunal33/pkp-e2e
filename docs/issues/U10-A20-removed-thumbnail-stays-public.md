# A removed journal, press or server thumbnail stays online, or comes back when another language has one

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/ojs#2067` for `pkp/pkp-lib#3594` · [43b3907299](https://github.com/pkp/ojs/commit/43b3907299b8cfd08c0903f672027fc32320beeb) · 2018-10-23 · Nate Wright (NateWr); OMP: `pkp/omp#799` for `pkp/pkp-lib#5784` · [71eec151ed](https://github.com/pkp/omp/commit/71eec151eddf23bd920d4158e6e2125b3a7cffd8) · 2020-05-28 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U10 [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a20)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager who presses "Remove" under "Journal thumbnail" on Settings ›
Website › Appearance › "Setup" and saves expects the picture to be
gone. The box stays empty after a reload, but the picture stays in the
journal's public files and still opens at its old address, for anyone,
signed in or not. A "Logo" removed in the same save is deleted.

Nothing on screen shows that the thumbnail is still there, and no
screen can delete it; as with a removed style sheet ([A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a5)), it
matters when the picture was meant to be withdrawn.

When the journal also has a thumbnail in another language, removing
one language's thumbnail does not even clear the setting: the save
shows "Saved", and after a reload the removed picture is back in its
box and is still the journal's thumbnail in that language.

## Impact

- **Lost:** no content. A removed thumbnail stays public at a fixed
  address anyone can work out (`/public/journals/<id>/journalThumbnail_<locale>.<ext>`;
  a press's under `/public/presses/<id>/`, a server's under
  `/public/contexts/<id>/`). The old picture also stays public when a
  thumbnail or a logo is replaced by one of another file type, by a
  separate fault (Cause, Reach). Readers see a thumbnail only in the
  list of journals [presses, servers] on the site's home page, which a
  site shows when it hosts more than one; with two languages the
  picture whose removal was undone stays in that list for readers of
  its language (by the code: each app's `indexSite.tpl`).
- **Who:** a manager who removes the "Journal thumbnail" [OMP: "Press
  thumbnail"; OPS: "Server thumbnail"], on Settings › Website ›
  "Appearance" › "Setup", the same place in each app. Removing one is
  rare; having one per language rarer.
- **Way round:** for the leftover file, upload a harmless picture of
  the same file type in its place, save, then remove it: the harmless
  picture overwrites the old one under the same name and is what stays
  at the address (tried on screen). For the second case, remove every
  language's thumbnail in one save, then upload again the ones to keep
  (by the code: the path the first group of Steps takes, which clears
  the setting).

Medium: with a thumbnail in two languages, "Remove" shows "Saved" and
changes nothing, though there is a way round on screen. With one
language the screen is right and only the file stays behind, which
alone would be low.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. Its journal [press, server] has no thumbnail and no logo, and
  works in English and French.
- On your computer: three small PNG pictures, `h19p-thumbnail.png`,
  `h19p-thumbnail-fr.png` and `h19p-logo.png` (the control).

One language:

1. Sign in as `rvaca` (password `rvacarvaca`), the Journal manager
   [OMP: Press manager; OPS: Preprint Server manager].
2. Go to Settings › Website, open the "Appearance" tab, then its
   "Setup" tab.
3. Under "Journal thumbnail" [OMP: "Press thumbnail"; OPS: "Server
   thumbnail"], press "Upload File" and choose `h19p-thumbnail.png`.
   Under "Logo", press "Upload File" and choose `h19p-logo.png`. Press
   "Save".
4. Reload the page and open "Appearance" › "Setup" again. Both boxes
   show their picture. Note the thumbnail's address
   (`…/public/journals/1/journalThumbnail_en.png`; OMP
   `…/public/presses/1/pressThumbnail_en.png`, OPS
   `…/public/contexts/1/serverThumbnail_en.png`) and the logo's
   (`…/pageHeaderLogoImage_en.png`).
5. Press "Remove" under the thumbnail box and "Remove" under "Logo",
   then "Save".
6. Reload the page and open "Appearance" › "Setup" again.
7. Sign out and open the thumbnail address noted in step 4, then the
   logo's.

**Expected:** both addresses answer "404 Not Found": a removed picture
is gone.

**Observed:** the thumbnail address answers 200 `image/png` with the
removed picture. The logo address answers "404 Not Found". Step 5's
save shows "Saved", and after step 6 both boxes are empty ("Drop files
here to upload", "Upload File").

Two languages, on a freshly loaded dataset again:

1. Sign in as `rvaca` and go to Settings › Website › "Appearance" ›
   "Setup".
2. Under "Journal thumbnail" [OMP: "Press thumbnail"; OPS: "Server
   thumbnail"], press "Upload File" and choose `h19p-thumbnail.png`.
   Press "French" above the form, and under the French thumbnail box
   press "Upload File" and choose `h19p-thumbnail-fr.png`. Press
   "Save".
3. Reload the page, open "Appearance" › "Setup" again and press
   "French". Note both thumbnails' addresses (`…/journalThumbnail_en.png`
   and `…/journalThumbnail_fr_CA.png`).
4. Press "Remove" under the English thumbnail box only, then "Save".
5. Reload the page, open "Appearance" › "Setup" again and press
   "French".
6. Sign out and open both addresses noted in step 3.

**Expected:** the English box is empty and its address answers "404
Not Found"; the French box keeps its picture, and its address answers
200.

**Observed:** step 4 shows "Saved", but after step 5 the English box
shows its picture again, with "Remove", beside the French one. Both
addresses answer 200 `image/png`.

## Cause

Each app's `ContextService::afterEditContext()` saves the thumbnail,
one language at a time (OJS `classes/services/ContextService.php`,
lines 108–124; OMP lines 126–142; OPS lines 102–118):

```php
$localeValue = $this->_saveFileParam(
    $newContext,
    $params['journalThumbnail'][$localeKey],
    'journalThumbnail',
    $request->getUser(),
    $localeKey,
    true
);
$newContext->setData('journalThumbnail', $localeValue, $localeKey);
```

Both lines are wrong for a removal, where the form sends `null` for
that language.

The first passes the wrong context. `_saveFileParam()` deletes the
stored file by reading the setting from the context it is given
(`$context->getData($settingName, $localeKey)`, pkp-lib
`classes/services/PKPContextService.php`, line 894). `afterEditContext()`
runs on the `Context::edit` hook, which `PKPContextService::edit()`
calls after merging the submitted values into `$newContext` (line 692)
and before saving it. So in `$newContext` the thumbnail is already the
submitted `null`, nothing is found and no file is removed. The hook
passes the stored context as `$args[1]` (`$currentContext`), which
`afterEditContext()` already reads for its other checks, and
`PKPContextService::edit()` itself passes the stored context for
"Logo", "Homepage Image" and "Favicon", which is why those files are
deleted.

The second writes the result back one language at a time, which loses
a removal. `DataObject::setData()` with a locale and a `null` value
removes that language from the object's data rather than keeping a
`null` there (`classes/core/DataObject.php`, lines 126–135).
`SchemaDAO::updateObject()`, which then writes the context, deletes a
language's row only when its value is `null` (`classes/db/SchemaDAO.php`,
line 169), and the whole setting only when the property is gone (line
162). With every language empty the property is gone and the setting
is deleted, which is why the box is cleared in the first group of
Steps. With another language still
set, the removed language is simply absent, so its row stays and the
picture comes back. `PKPContextService::edit()` avoids this for the
other pictures by writing into `$params`, where the `null` survives the
merge.

Reach:

- The journal's, press's or server's style sheet is left behind too,
  by a separate fault with its own report
  ([A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a5)).
- No other upload has either mistake. The other callers of
  `PKPContextService::_saveFileParam()` (its `add()` and `edit()`)
  pass the stored context and write into `$params`; the site's and the
  publication's uploads go through their own `_saveFileParam()`
  methods (`PKPSiteService`, `publication\Repository`), whose callers
  pass the stored site or publication and write into the array.
  Checked in the code.
- Replacing a picture with one of another file type (a JPEG for a
  PNG) leaves the old file public at its old address, for the logo as
  for the thumbnail, because an upload never deletes the file it
  replaces and the name carries the extension. Seen on screen on
  `main`; a separate fault this fix does not reach. A replacement of
  the same type overwrites the old file.

## Proposed fix

In each app's `ContextService::afterEditContext()`, pass the stored
context to `_saveFileParam()` and write the whole localized value back
at once, as `PKPContextService::edit()` does for the other pictures.
The patches are
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/removed-thumbnail-stays-public/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/removed-thumbnail-stays-public/fix-omp.diff)
and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/removed-thumbnail-stays-public/fix-ops.diff)
as they stand; apply each at its app's root with `patch -p1`. OJS's:

```diff
--- a/classes/services/ContextService.php
+++ b/classes/services/ContextService.php
@@ -107,20 +107,21 @@
         // Move an uploaded journal thumbnail and set the updated data
         if (!empty($params['journalThumbnail'])) {
             $supportedLocales = $newContext->getSupportedFormLocales();
+            $thumbnail = (array) $newContext->getData('journalThumbnail');
             foreach ($supportedLocales as $localeKey) {
                 if (!array_key_exists($localeKey, $params['journalThumbnail'])) {
                     continue;
                 }
-                $localeValue = $this->_saveFileParam(
-                    $newContext,
+                $thumbnail[$localeKey] = $this->_saveFileParam(
+                    $currentContext,
                     $params['journalThumbnail'][$localeKey],
                     'journalThumbnail',
                     $request->getUser(),
                     $localeKey,
                     true
                 );
-                $newContext->setData('journalThumbnail', $localeValue, $localeKey);
             }
+            $newContext->setData('journalThumbnail', $thumbnail);
         }
```

OMP's (`pressThumbnail`) and OPS's (`serverThumbnail`) are the same
change. For an upload `_saveFileParam()` reads only the context's id,
which both objects share, so new thumbnails are saved as before. Both
changes are needed: passing `$currentContext` alone deletes the English
file while its setting stays, leaving a broken picture in the box when
another language has one.

Tried on all three apps: with the diffs applied, both groups of Steps
end with the removed thumbnail's address answering "404 Not Found" and
its box empty, and in the first group the logo's address answers "404
Not Found" as before. Three cases the fix must leave alone come out
the same with the diffs applied and without them:

- An English and a French thumbnail saved again untouched are both
  still served.
- The French thumbnail is still shown and served after the English one
  is removed.
- "Remove" and "Upload File" with a second picture in one save: the
  address serves the new picture.

**Alternatives:**

- Pass `$currentContext` and keep the per-language `setData()`, adding
  a `DELETE` for a `null`: a second way of storing a setting beside the
  one `PKPContextService::edit()` uses.
- Move the thumbnail into `PKPContextService::edit()`'s list of
  uploads, with its setting name asked of the app: one place instead
  of three, but a new per-app method for one field.

**What goes with it:**

- Stored data: no repair proposed. An upgrade step could delete
  `<kind>Thumbnail_*` files from each context's public folder where the
  setting is empty for that language.
- Backport: the same block sits in each app's `ContextService` on 3.5,
  3.4 and 3.3 (`.inc.php` on 3.3, passing the user's id); the diffs
  apply to 3.5 with offsets, and port by hand further back.
- Test: a check that removes one language's thumbnail beside another
  and opens both addresses.

Medium: the logo is saved by pkp-lib's shared service, but each app
saves its own thumbnail in its own `ContextService`, so the fix is two
changes in each of three app repos, with their tests; no data repair.

## Evidence

- The script that takes the Steps through the browser on a freshly
  loaded default dataset, in pkp-e2e's own harness:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/removed-thumbnail-stays-public/walk.js),
  run as `node bin/probe.js all <script>` for the first group of Steps,
  with `WALK=lang` in front for the second group and the three cases
  under Proposed fix, and with `WALK=around` for the Impact's way round
  and the replacement by another file type (Cause, Reach).
- Walked on OJS, OMP and OPS: on `main`, the first group without the
  fix and with it, the second group with it and without it, and the
  way round and replacement once without it; on `stable-3_5_0`, both
  groups without the fix. PostgreSQL, pkp/datasets eaf024c5
  (2026-10-18). Each address was opened as the box's picture links it,
  with a timestamp query (`…/journalThumbnail_en.png?<time>`). No
  request behind these steps failed on the server, no page script
  failed, and the server log held no line for the saves. After the
  second group without the fix, the database still held the English
  `journalThumbnail` row (OJS `main`).
- Not driven: 3.4 and 3.3; the site's list of journals, which needs a
  second journal.
- Tips:
  - **`main`:** OJS 6b4323ced7, OMP 5777025bec, OPS f048e747b4, each
    with lib/pkp 042726ebf6.
  - **`stable-3_5_0`:** OJS 007c2cd0d6, OMP 2d575f2506, OPS e737a9e465,
    each with lib/pkp 092ec34b0f.
  - **`stable-3_4_0`:** OJS 0012bd1022, OMP e30fa7e38c, OPS 0f1e21a117,
    pkp-lib a71d6bd2ca.
  - **`stable-3_3_0`:** OJS d7d9dd14ec, OMP 8e72fc8836, OPS c5532e2161,
    pkp-lib 5e84acd11b.
- Code reads: on `main`, each app's `ContextService::afterEditContext()`
  and `indexSite.tpl`, `IndexHandler::index()` (one context: the
  site's home page goes to it); pkp-lib `PKPContextService::edit()`,
  `add()`, `_saveFileParam()` and `moveTemporaryFile()`,
  `DataObject::setData()`, `SchemaDAO::updateObject()`, and the callers
  of `PKPSiteService::_saveFileParam()` and
  `publication\Repository::_saveFileParam()`. On 3.5, 3.4 and 3.3 the
  same methods, with the same lines; the diffs apply to 3.5 with
  offsets (`patch --dry-run`).
- Introduced: `git blame` on OJS's lines puts them on 665ed1f925 (2021,
  PSR-12 formatting only); `git log -S'_saveFileParam('` on the file
  takes them to 43b3907299. In its pkp-lib counterpart, 5f3be929e6,
  the three behaviours the Cause names were already in place: the merge
  before the hook, `SchemaDAO` deleting a language's row only for a
  `null`, and `DataObject::setData()` dropping a language set to
  `null`. OPS carries 43b3907299 in its history; OMP's block came with
  71eec151ed, which added the press thumbnail on the OJS pattern.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library by the symptom's words and by `afterEditContext`,
  `_saveFileParam` and `removeContextFile`. The nearest hit,
  `pkp/pkp-lib#868` (OJS 3.0's image boxes not refreshing after a
  delete, closed 2019), is another fault.
