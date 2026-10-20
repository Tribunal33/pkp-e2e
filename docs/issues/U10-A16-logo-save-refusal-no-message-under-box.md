# A logo or homepage image the server refuses on "Save" gets no message under its box

- **Severity** medium
- **Effort** medium
- **Kind** intention gap
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS (the `stable-3_5_0` branch; no tagged release yet, 3.5.0-5 predates the change)
  - 3.4: none (code; nothing is refused at "Save" there)
  - 3.3: none (code; nothing is refused at "Save" there)
- **Introduced** `pkp/pkp-lib#13512` (direct commits, no PR) · [07bc43fe67](https://github.com/pkp/pkp-lib/commit/07bc43fe6732e0da9d486cea432ac9898d0603ab) · 2026-10-16 · Alec Smecher (asmecher); on `stable-3_5_0` as [092ec34b0f](https://github.com/pkp/pkp-lib/commit/092ec34b0ff6242a3fd9c4c63109f7d45096f259) (written 2026-10-14, committed 2026-10-16)
- **Upstream** none found (2026-10-20)
- **Tracked in** spec U10 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a16)
- **Checked** 2026-10-20, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager chooses an SVG or BMP picture as the "Logo" (or the
"Homepage Image") in the website settings. The box takes it and shows
its preview, but "Save" is refused. Nothing appears under the box:
the form's foot reads "Please correct one error." and does not say
what the error is. The server's message, "There was an error
uploading this image.", reaches only screen readers.

When the same save also carries a picture the server accepts, such
as a new PNG homepage image beside the refused logo, the accepted
picture is lost too. Once the manager replaces the logo and saves
again, the save is refused with "The file you uploaded could not be
found. Please try to upload it again." under "Homepage Image", and
the manager has to choose that picture a second time.

The server refuses every picture that is not PNG, JPEG, GIF, WebP or
ICO, and any picture whose file name's ending does not match its
contents (a PNG named "logo.jpg").

## Impact

- **Lost**: the refused picture is not stored, and the earlier logo
  stays. A picture accepted in the same save is not stored either:
  its file is copied to the public folder but the setting is not
  updated, and its upload is used up.
- **Who**: journal, press and server managers on Settings › Website ›
  "Appearance" › "Setup" (and "Advanced" for the favicon) who choose
  an SVG logo, a type many journals use, or a BMP or TIFF, or a picture
  whose name has the wrong ending.
- **Way round**: save the picture as a PNG, JPEG or WebP with the
  matching ending, and choose any other new picture again. Nothing on
  screen says that the type is the problem; a screen reader user hears
  the message after the foot's "Go to Logo:" link.

Medium: an SVG logo is refused with no visible reason, and a picture
saved beside it is silently dropped and then refused as "could not be
found", though there is a way round on screen. A refused type that
most managers use (PNG or JPEG) would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS).
- Pictures saved from an image editor: `logo.svg` (an SVG),
  `logo.bmp` (a 24-bit BMP), `logo.png` and `home.png` (PNGs).

Logo:

1. Sign in as `rvaca` (password `rvacarvaca`), the manager.
2. Open Settings › Website › "Appearance" › "Setup".
3. Under "Logo", press "Upload File" and choose `logo.svg`. The box
   shows its preview.
4. Press "Save".
5. Read the "Logo" box and the form's foot.

Homepage Image:

6. Reload the page and open "Appearance" › "Setup" again.
7. Under "Homepage Image", press "Upload File", choose `logo.bmp` and
   press "Save".

Both in one save:

8. Reload the page and open "Appearance" › "Setup" again.
9. Under "Homepage Image", choose `home.png`; under "Logo", choose
   `logo.bmp`. Press "Save".
10. Under "Logo", press "Remove", then "Upload File", choose
    `logo.png` and press "Save".

**Expected**: "There was an error uploading this image." under the
"Logo" box in step 4 (under "Homepage Image" in step 7), as a refused
field's message shows under any other field of the form. In step 9,
the logo is refused and nothing else changes; step 10 saves both
pictures.

**Observed**: the save answers 400 with the message keyed by the
setting alone, not by the box's language (`en`):

```
PUT /index.php/publicknowledge/api/v1/contexts/1
→ 400 {"pageHeaderLogoImage":["There was an error uploading this image."]}
```

"Saved" does not show. The box keeps the picture's preview with
nothing under it. The form's foot reads "Please correct one error.
Jump to next error"; its screen-reader text reads "Go to Logo: There
was an error uploading this image.". Step 7 gives the same, keyed
`homepageImage`, with "Go to Homepage Image:". A BMP "Logo" gives the
same as the SVG.

Step 9 gives the same answer, with nothing under either box. The
journal's public folder now holds `homepageImage_en.png`, while the
homepage image setting is still empty. Step 10 answers:

```
→ 400 {"homepageImage":{"en":["The file you uploaded could not be found. Please try to upload it again."]}}
```

That message shows under "Homepage Image". Neither picture is stored.

A PNG or WebP "Logo" saved the same way shows "Saved".

## Cause

Two things go wrong in the save, both in pkp-lib.

The picture is checked only while the files are being moved.
`PKPContextService::edit()` (`classes/services/PKPContextService.php`)
moves the favicon, homepage image and logo in that order, one language
after another, through `moveTemporaryFile()`. For an image setting,
that method (lines 828–832) throws `StoreTemporaryFileException` when
`getImageExtension()` does not know the type or
`FileManager::isValidImage()` finds that the name and contents
disagree. Every picture moved before the throw has already been
copied to the public folder and its temporary file deleted, but the
settings are never written. `PKPContextService::validate()` checks
only that each temporary file exists.

The refusal names the setting but not the language.
`PKPContextController::edit()`
(`api/v1/contexts/PKPContextController.php`, lines 421–425) catches
the exception and answers `{"<setting>": ["<message>"]}`. The
exception carries the setting's name as `targetPath`, but not the
`$localeKey` that `moveTemporaryFile()` was given. "Logo" and
"Homepage Image" are multilingual, with one box per language, and
every other refusal of a multilingual setting nests its message under
the language. For example, `validate()` reports a missing upload
through `ValidatorFactory::temporaryFilesExist()` as
`pageHeaderLogoImage.en`, answered as
`{"pageHeaderLogoImage":{"en":[…]}}`. ui-library's `FieldBase.vue`
`errors()` (lines 91–102) gives a multilingual field only the list
under its own language, so the box shows nothing. `FormErrors.vue`
takes a field's first entry whatever its shape, which is why the
foot's screen-reader text still carries the message.

Reach:

- "Logo" (SVG, BMP) and "Homepage Image" (BMP) walked on the three
  apps, `main` and `stable-3_5_0`; WebP accepted on all six. The save
  with both walked on OJS `main`; OMP and OPS share the code.
- Checked in the code, the same: "Favicon" ("Advanced"); the
  context's thumbnail (`journalThumbnail`, `pressThumbnail`,
  `serverThumbnail`, on the Setup tab), moved later by each app's
  `ContextService::afterEditContext()`, so a refused thumbnail also
  drops a logo or homepage image moved before it.
- Checked in the code, the same: the site's "Logo"
  (`pageHeaderTitleImage`, Administration › Site Settings), through
  `PKPSiteService::moveTemporaryFile()` and `PKPSiteController::edit()`.
- Checked in the code, the same message shape: a publication's "Cover
  Image" (multilingual; `IssueEntryForm` on OJS and OPS,
  `CatalogEntryForm` on OMP). `PKPSubmissionController::editPublication()`
  answers `{"coverImage":[…]}`. The refusal for a type
  `getImageExtension()` does not know is thrown by
  `Publication\Repository::_saveFileParam()` (line 1148).
- Checked in the code, not walked: when the journal already has a
  homepage image of the same type, the copy in step 9 overwrites
  `homepageImage_en.png` on disk, so the public pages show the new
  picture while its stored size and alternate text stay the old one's.
- Not affected: an announcement's and a highlight's "Image" are
  single-language fields, so their refusal shows under the box.
- Not this fault: a refusal of the upload itself (a file over the
  size limit), which the box drops for another reason:
  [U10-A16-upload-box-server-refusal-no-message](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U10-A16-upload-box-server-refusal-no-message.md).

## Proposed fix

A proposal, in two parts
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/logo-save-refusal-no-message-under-box/fix.diff)):

1. Check new pictures in `validate()`, before anything moves. A new
   `ValidatorFactory::temporaryFilesAreImages()`, written like
   `temporaryFilesExist()`, applies `moveTemporaryFile()`'s rule
   (`getImageExtension()` and `isValidImage()`) and reports a refusal
   as `<prop>.<locale>`. `PKPContextService::validate()` calls it for
   the favicon, homepage image and logo, and `PKPSiteService::validate()`
   for the site's logo:

   ```php
   ValidatorFactory::temporaryFilesAreImages(
       $validator,
       ['favicon', 'homepageImage', 'pageHeaderLogoImage'],
       ['favicon', 'homepageImage', 'pageHeaderLogoImage'],
       $props,
       $allowedLocales,
       $user ? $user->getId() : null
   );
   ```

   A refused picture then answers 400 under its language, and no file
   of the save is moved.

2. Nest a refusal that still happens while moving under its language.
   `StoreTemporaryFileException` gets an optional
   `public ?string $localeKey = null`. `moveTemporaryFile()` (context
   and site) and `Publication\Repository::_saveFileParam()` pass the
   locale. The catches answer
   `$e->localeKey ? [$e->localeKey => $message] : $message`. For the
   context and site catches this completes `07bc43fe67`'s design, which
   keys the answer by `targetPath` so the form can place the message.
   The two `PKPSubmissionController` catches key the answer by the
   literal `'coverImage'`, since a publication's `targetPath` is a file
   name (`submission_<id>_<pubId>_coverImage`); the diff keeps that key
   and nests the message under the locale. This part covers the
   thumbnail and the cover image, which the first part does not check.
   Highlights and announcements have no locale and keep their flat
   answer.

Tried on `main` on the three apps:

- The BMP "Logo" and "Homepage Image" saves answer
  `{"pageHeaderLogoImage":{"en":["There was an error uploading this image."]}}`
  (`homepageImage` the same), and the box reads "There was an error
  uploading this image." under its preview.
- In the save with both, the logo is refused the same way and nothing
  is copied to the public folder. After the logo is replaced with a
  PNG, the next save shows "Saved" and stores both pictures.
- A PNG "Logo" still saves with "Saved".
- A BMP chosen in the French "Logo" box is refused, with its message
  under the French box and not the English one; without the fix it
  shows under neither.

**Alternatives**

- The second part alone (tried first): the message shows under the
  box, but a picture saved beside the refused one is still copied and
  dropped.
- In ui-library, give every language's box of a field a flat error
  list. That hides the server's inconsistent shape, but it would also
  put the message under boxes that hold no new picture.

**What goes with it**

- Left out: the thumbnail is still checked only while moving, after
  the logo and homepage image. A call to the new helper in each app's
  `ContextService::validateContext()` would cover it. The cover image
  gets the same check in `Publication\Repository::validate()` in the
  fix proposed in
  [the follow-up report on pkp/pkp-lib#13512](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/reports/2026-10-19-pkp-lib-13512.md),
  which uses the same helper.
- The 400 body of the context, site and publication routes changes
  from a flat list to a list per language, the shape validation
  already answers.
- Data: a homepage image or favicon dropped this way leaves a file in
  the public folder that no setting names. It is harmless, and the
  next accepted save of a picture of the same type replaces it.
- Backport: the hunks apply to `stable-3_5_0` at shifted lines; 3.5
  has `temporaryFilesExist()` and `isValidImage()`.
- Guard: a unit test of `PKPContextService::validate()` with a BMP
  `pageHeaderLogoImage.en`, expecting the nested error; or the e2e
  scenario in U10 (a **Planned** item) of a BMP "Logo" whose message
  shows under the box, saved beside a new homepage image.

Medium: eight files in pkp-lib (a new validation helper, its calls
in the context and site services, and the exception and its four
catches), tried; it changes the 400 body REST clients read.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/logo-save-refusal-no-message-under-box/walk.js)
  with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/logo-save-refusal-no-message-under-box/lib.js)
  takes these Steps:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/logo-save-refusal-no-message-under-box/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The default mode
  takes steps 6–7 and a BMP "Logo"; `MODE=types` takes steps 1–5 with
  an SVG and a WebP; `MODE=mixed` takes steps 8–10 and reads the public
  folder. `MODE=nb` is the neighbour check (a PNG "Logo", and a BMP in
  the French "Logo" box), walked with the fix in and out.
- Walked on PostgreSQL, each install on its default dataset
  (pkp/datasets 35759b4c, 2026-10-19). The fault does not touch the
  database.
- The dataset holds no logo or homepage image, so these walks show
  only that nothing is stored. That an earlier logo stays rests on the
  walk of 2026-10-19 (a PNG "Logo" saved, then a BMP over it, the PNG
  kept in the public header) and on the code (`edit()` throws before
  `updateObject()`).
- Code reads. `main` and 3.5: the Cause's lines, the same on both
  (3.5's catch at `PKPContextController.php` line 417, the throw at
  `PKPContextService.php` line 806, the same move order in `edit()`);
  `FieldBase.vue` `errors()`, `FormErrors.vue` `errorList()` and
  `useForm.js` `structuredErrors()` in ui-library, the same on both.
  `getImageExtension()` (`FileManager.php` lines 588–626) knows GIF,
  JPEG, PNG, ICO and WebP among picture types; `isValidImage()` also
  needs `getimagesize()`, which refuses SVG. 3.4
  (`origin/stable-3_4_0`) and 3.3 (`origin/stable-3_3_0`):
  `PKPContextService::moveTemporaryFile()` takes the extension from
  `getDocumentExtension()` or `getImageExtension()`, has no picture
  check and throws nothing, and the contexts handler has no
  `StoreTemporaryFileException` catch.
- Release: OJS tag `3_5_0-5` (2026-06-30, the latest 3.5 tag on
  pkp/ojs and pkp/pkp-lib) points at pkp-lib `8b5f0fdc8d`, which does
  not contain `092ec34b0f`.
- Introduced: `git log -L` on the catch in `PKPContextController.php`
  gives `07bc43fe67` on `main` and `092ec34b0f` on `stable-3_5_0`.
  The type gate itself came a commit earlier, with `266505ecd8`
  (2026-10-13), as a silent `return false`. `07bc43fe67` added
  `isValidImage()` and the throw that makes it a refusal.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched by the
  symptom's words ("logo upload error message", "homepage image
  upload error", "bmp logo") and by `errorUploadingImage`,
  `StoreTemporaryFileException` and `FieldUploadImage`.
  `pkp/pkp-lib#12744` (open) read: announcements refusing `.jpeg`
  pictures, not this fault.
- Not driven: the thumbnail, "Favicon", the site's "Logo" and the
  cover image (code only); TIFF (code only); the overwrite of an
  earlier homepage image of the same type (code only); the save with
  both on OMP and OPS, and on 3.5.
- Tips:
  - **`main`:** OJS 6b4323ced7, OMP 5777025bec, OPS f048e747b4;
    lib/pkp 042726ebf6 and lib/ui-library 99abe252 in each.
  - **`stable-3_5_0`:** OJS b56f8b74ff, OMP 722d3e661e, OPS
    110effdd6e; lib/pkp cd82be0528 and lib/ui-library 2576e00a in each.
  - **`stable-3_4_0`:** OJS 0012bd1022, OMP e30fa7e38c, OPS
    0f1e21a117, pkp-lib a71d6bd2ca, ui-library ee684b34.
  - **`stable-3_3_0`:** OJS d7d9dd14ec, OMP 8e72fc8836, OPS
    c5532e2161, pkp-lib 5e84acd11b, ui-library 96959f9e.
