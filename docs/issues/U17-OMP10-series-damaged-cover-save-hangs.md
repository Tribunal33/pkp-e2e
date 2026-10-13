# A series or category "Save" with a damaged PNG as its cover fails halfway and can break the existing cover

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS (series: OMP only)
  - 3.5: OJS, OMP, OPS (series: OMP only)
  - 3.4: OJS, OMP, OPS (code; series: OMP only)
  - 3.3: OJS, OMP, OPS (code; series: OMP only)
- **Introduced** not traced to a PR; present since [ce508930ea](https://github.com/pkp/omp/commit/ce508930ea632eb329e8fd56ba7ac28eb537f422) · 2012-07-16 · Jason Nugent (jnugent), which gave series and categories their uploaded cover
- **Upstream** none found (2026-10-13)
- **Tracked in** spec U17 [OMP10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#omp10) · spec U16 [A24](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a24)
- **Checked** 2026-10-13, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press manager editing a series picks, as its "Cover Image", a PNG
whose picture data is damaged. It uploads like any picture, but "Save"
then fails on the server and never answers: the window stays open with
"Save" greyed out and a spinner, and no message shows; "Cancel" closes
it. The save has stopped halfway: the window's other changes are stored,
and the files of a cover the series already had are deleted, so the
window and the series' public page show a broken picture. The series
window hangs this way on `main` and 3.5; 3.4 and 3.3 have the same code.
A damaged JPG or GIF passes the same check and fails at the same point.

The old cover cannot be restored from the app. Saving a sound picture
gives the series a cover again; a press that no longer has the original
file has lost that cover.

A category's "Cover Image" fails too, on journals, presses and preprint
servers, but with a message: the save answers "An unexpected error has
occurred. Please reload the page and try again." On `main` a new
category is created without its cover, and an existing cover is kept.
On 3.5 and older, the save hangs like the series window and an existing
category cover is deleted the same way.

## Impact

- **Lost**: the cover a series already had, and on 3.5 and older a
  category's: its files are deleted and the public page shows a broken
  picture. Only a copy the press kept can bring it back.
- **Who**: managers who give a series or a category a cover from a
  damaged file (a broken download, a truncated export), under Settings ›
  Press › "Series" or Settings › Journal / Press / Server ›
  "Categories".
- **Way round**: upload a sound PNG, JPG or GIF and save again; the
  series or category shows that picture. The other changes from the
  failed save are already stored.

Medium: it takes a damaged file to meet it, and a sound picture gives
the series a cover again; it would be high if ordinary pictures could
trigger it, since a cover the press has no copy of is lost for good.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (press `publicknowledge`; its
  series "Library & Information Studies", path `lis`, has no cover).
  For the categories, any of the three apps' datasets ("Applied Science";
  on OPS 3.5, whose dataset has other categories, "History").
- PHP with production settings (`zend.assertions` off). On a
  development install (`zend.assertions = 1`) step 6 fails one line
  earlier and logs `AssertionError: assert($image)` at
  `SeriesForm.php:304` instead of the `TypeError` below; the window and
  what is stored are the same. The category steps on `main` log the same
  on either setting.
- Two pictures on the computer:
  - `cover.png`, any sound PNG.
  - `damaged.png`, a 2×3 PNG whose image-data checksum is wrong (any PNG
    with a byte changed inside its image data does the same):
    `echo iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAIAAAA2iEnWAAAAEElEQVR4nGP4z8AARAwoFABE0AX7pM/efwAAAABJRU5ErkJggg== | base64 -d > damaged.png`

The series (OMP):

1. Sign in as `rvaca` (Press manager).
2. Open Settings › Press › "Series".
3. On "Library & Information Studies", open the row's arrow and press
   "Edit".
4. Type "u17h13f first" in "Subtitle".
5. Under "Cover Image", press "Upload File" and choose `damaged.png`. The
   box shows the file's name and "Change File".
6. Press "Save".
7. Press "Cancel", reload the page and press "Edit" on "Library &
   Information Studies" again.
8. Under "Cover Image", "Upload File" `cover.png`, then "Save".
9. "Edit" again. "Current Image" shows the picture. Change "Subtitle" to
   "u17h13f second", "Upload File" `damaged.png`, and press "Save".
10. Press "Cancel", reload, and "Edit" again; then open the series' page,
    `/index.php/publicknowledge/catalog/series/lis`.

**Expected**: "Save" refuses the picture with the message the window
already has for a refused image, "An invalid image was uploaded.
Accepted formats are .png, .gif, or .jpg.", and stores nothing from that
save; the cover from step 8 stays.

**Observed**: at step 6 the window stays open with "Save" greyed out and
the spinner turning beside "Cancel", and no message anywhere. "Cancel"
closes it. The save's answer and the server log:

```
POST …/$$$call$$$/grid/settings/series/series-grid/update-series?seriesId=1  500  (empty body)

PHP Warning:  imagecreatefrompng(): gd-png: fatal libpng error: IDAT: CRC error
PHP Warning:  imagecreatefrompng(): "…/temp/png1hmABg" is not a valid PNG file in …/controllers/grid/settings/series/form/SeriesForm.php on line 296
PHP Fatal error:  Uncaught TypeError: imagecopyresampled(): Argument #2 ($src_image) must be of type GdImage, false given in …/controllers/grid/settings/series/form/SeriesForm.php:318
```

Reopened at step 7, "Subtitle" reads "u17h13f first" and there is no
"Current Image". At step 8 the window closes with "Your changes have
been saved." Step 9 gives the same hanging window and the same log. At
step 10 "Subtitle" reads "u17h13f second", and "Current Image" and the
series' page show a broken picture: its address,
`catalog/thumbnail?type=series&id=1`, answers 200 with an empty body
where it answered a 97-byte PNG before step 9.

A category (OJS, OMP, OPS):

1. As `rvaca`, open Settings › Journal (Press, Server) › "Categories" and
   press "Add Category" [3.5: the list's "Add Category" link opens the
   older form].
2. Type "u17h13f Category" in "Name" and "u17h13f-category" in "Path";
   under "Cover Image" choose `damaged.png`. Press "Save" [3.5: "OK"].
3. Reload the page.
4. "Edit" "Applied Science" [3.5: press its name], choose `cover.png`
   under "Cover Image", "Save".
5. "Edit" "Applied Science" again, choose `damaged.png`, "Save".
6. Reload and "Edit" "Applied Science".

**Expected**: the window refuses the picture under "Cover Image" and
stores nothing.

**Observed** on `main`: at step 2 the page shows "An unexpected error
has occurred. Please reload the page and try again." and the window stays
open:

```
POST …/api/v1/categories  500
{"error":"imagecopyresampled(): Argument #2 ($src_image) must be of type GdImage, false given"}
```

After the reload "u17h13f Category" is in the list, without a cover.
Step 5 gives the same 500; at step 6 the cover from step 4 is still
there. On 3.5 both saves answer 500 with an empty body and the window
stays open, as for the series; after step 6 "Current Image" is a broken
picture.

The same steps with `cover.png` save normally everywhere.

## Cause

OMP `SeriesForm::validate()`
(`controllers/grid/settings/series/form/SeriesForm.php`, lines 134–139)
accepts an uploaded cover when `getimagesize()` returns a width and a
height. `getimagesize()` reads only the file's header, so a PNG, JPG or
GIF whose image data is damaged passes.

`SeriesForm::execute()` then works in an order that cannot be undone. It
stores the series' fields first (`Repo::section()->edit()`, line 264),
deletes the old cover's two files (`deleteByPath()`, lines 283–284), and
only then decodes the picture to build its small copy:
`imagecreatefrompng()` (line 296) returns `false` on the damaged data,
nothing checks it (the `assert($image)` at line 304 is compiled out
under production settings), and `imagecopyresampled()` (line 318)
throws a `TypeError`. The new files are never written and `setImage()`
is never reached, so the stored cover record still names the deleted
files. The legacy form handler gets no answer to show, so the window
waits for ever.

The rule broken is that a cover the app cannot read must be refused in
validation, before anything is stored.

Reach:

- **Categories on `main`** (walked on OJS, OMP and OPS): lib/pkp
  `Category\Repository::validate()` (`classes/category/Repository.php`,
  lines 240–248) checks the same way with `getimagesize()`.
  `CategoryCategoryController::saveCategory()` stores the category
  (lines 163–167) before `generateThumbnail()` decodes the picture with
  `imagecreatefrompng()` (line 284) and throws at `imagecopyresampled()`
  (line 297). A new category is left without its cover.
- **Why an existing category cover survives on `main`**: by accident.
  At line 183 the controller reads the old cover in
  `if ($temporaryFileId || (!$submittedImageData && $oldImageData = $category->getImage()))`.
  When a new file is sent, `||` short-circuits, `$oldImageData` is never
  set, and the old files are never removed. So a cover replaced by a
  picture of another type leaves the old files behind on disk. A fix for
  that leak would delete the old files before the decode, as the older
  forms do, unless the validator fix below has landed first.
- **Categories on 3.5, 3.4 and 3.3**: lib/pkp's older `CategoryForm`
  (`controllers/grid/settings/category/form/CategoryForm.php`) has the
  series form's code and order: `getimagesize()` in `validate()`, then
  the category is stored, the old files are deleted and the decode
  throws. Walked on 3.5 in all three apps; code on 3.4 and 3.3.
- **A monograph's catalog cover** (OMP, code only, not driven): OMP
  `Publication\Repository::makeThumbnail()` decodes JPEG, PNG, GIF and
  WebP and passes the result to `imagecopyresampled()` unchecked. Its
  `if (!isset($cover))` guard does not fire for `false`. It runs after
  the publication is stored, from both `add()` (line 97) and `edit()`
  (line 293), and no image check runs before it.
- **Other picture uploads**: none. No other caller of
  `imagecreatefrom*()` exists in pkp-lib, OJS, OMP or OPS
  (`ContextService` rebuilds stored covers' small copies, and does not
  read uploads).

## Proposed fix

In both validators, refuse a picture that GD cannot decode, next to the
`getimagesize()` check, so the form says what is wrong and nothing is
stored or deleted. The diff for an OMP checkout:
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/series-damaged-cover-save-hangs/fix-omp.diff)
(for OJS and OPS, the lib/pkp half alone:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/series-damaged-cover-save-hangs/fix-ojs.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/series-damaged-cover-save-hangs/fix-ops.diff)).

```diff
--- a/controllers/grid/settings/series/form/SeriesForm.php
+++ b/controllers/grid/settings/series/form/SeriesForm.php
-                $this->_sizeArray[0] <= 0 || $this->_sizeArray[1] <= 0
+                $this->_sizeArray[0] <= 0 || $this->_sizeArray[1] <= 0 ||
+                // getimagesize() reads only the header: check that the picture itself can be read before execute() stores anything
+                !@imagecreatefromstring(file_get_contents($temporaryFile->getFilePath()))
             ) {
                 $this->addError('temporaryFileId', __('form.invalidImage'));
-                return false;
             }
--- a/lib/pkp/classes/category/Repository.php
+++ b/lib/pkp/classes/category/Repository.php
-                    $sizeArray[1] <= 0
+                    $sizeArray[1] <= 0 ||
+                    // getimagesize() reads only the header: check that the picture itself can be read before the category is stored
+                    !@imagecreatefromstring(file_get_contents($temporaryFile->getFilePath()))
                 ) {
                     $validator->errors()->add('image', __('form.invalidImage'));
```

GD's `imagecreatefromstring()` decodes JPEG, PNG and GIF, the formats
the two saves go on to decode, and returns `false` on damaged data; the
`@` keeps a refused upload out of the error log.

The series half also drops the early `return false`. That line skips
`parent::validate()`, which is where a legacy form raises its
form-error notice, so with the decode check alone the damaged picture
would be refused with no message at all. The same early return makes
the series window drop an SVG cover silently, a related fault filed as
[pkp-e2e#484](https://github.com/jardakotesovec/pkp-e2e/issues/484);
whichever fix lands first removes it.

Tried on `main` in all three apps. The series window now refuses
`damaged.png` with "An invalid image was uploaded. Accepted formats are
.png, .gif, or .jpg." as the page's notice; the window stays open and
neither the subtitle nor the cover changes. The category window shows
the same message under "Cover Image" (400), and no category is created.
With the fix in and out, a sound PNG and a sound JPEG on other series, a
series save with no file, and a PNG on another category saved and
showed as before.

**Alternatives**:

- Check `imagecreatefrompng()`'s result in `execute()` and in
  `generateThumbnail()`: the series and category fields are stored by
  then, so the save would still be half done, and the older forms would
  still have deleted the old files.
- Reorder `execute()` to write the new files before deleting the old
  ones: it keeps the old cover, but the save still fails. It also
  protects against failures the validator cannot foresee (a full disk),
  so it is worth doing; the recommendation is a separate PR, to keep
  this fix small and easy to backport. The team decides.

**What goes with it**:

- Land the validator fix before anyone fixes the category controller's
  file leak at line 183 (Cause).
- The monograph's catalog cover is left out of this diff. Its guard
  belongs in OMP `Publication\Repository`, covers WebP as well, and
  must run before `add()` and `edit()` store the publication.
- Backport: 3.5, 3.4 and 3.3 take the series half as written (3.3 in
  `SeriesForm.inc.php`, tab-indented). The older lib/pkp
  `CategoryForm::validate()` needs the same two changes as the series
  form: the decode check, and dropping its own early `return false`.
- Test: the e2e scenario in spec U17 (a **Planned** item): a damaged PNG
  as a series' and a category's cover is refused with the message, and
  nothing changes.

Medium: the check goes into two validators in two repositories (OMP's
`SeriesForm` and pkp-lib's category repository), the series side also
has to lose its early `return false` for the refusal to show, and the
older lines need the same pair of changes in `CategoryForm`.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/series-damaged-cover-save-hangs/walk.js)
  with its helpers in `lib.js`, on installs loaded from PKP's default
  test dataset (pkp/datasets 384e28b, 2026-10-12, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/series-damaged-cover-save-hangs/walk.js`.
  It writes its own `cover.png`, `damaged.png` (the bytes in the Steps)
  and a 3×2 JPEG, and records each save's answer, the window's state,
  the notices, the server log lines written during the save, the
  pictures shown with what their addresses answer, and the stored
  `image` value.
- Walked on `main` (series on OMP, categories on all three apps) and on
  `stable-3_5_0` (the same).
- Fix tried on `main` in all three apps: the walk, and a second run on
  other series and categories ("History" a PNG, "Education" a JPEG,
  "Psychology" a subtitle with no file, the category "Social Sciences"
  a PNG) with the fix in and out.
- Damaged JPG and GIF: not walked. With PHP 8.3's GD, a 3×2 JPEG and GIF
  cut short, and a JPEG with bytes overwritten near its end, each passed
  `getimagesize()` and failed both `imagecreatefromjpeg()` /
  `imagecreatefromgif()` and `imagecreatefromstring()` (checked outside
  the app); `execute()` decodes them the same way.
- Code reads: `SeriesForm::validate()` and `execute()` on every line;
  lib/pkp `Category\Repository::validate()`,
  `CategoryCategoryController::saveCategory()` and
  `generateThumbnail()` on `main`; lib/pkp `CategoryForm` on 3.5, 3.4
  and 3.3; OMP `Publication\Repository::add()`, `edit()` and
  `makeThumbnail()` on `main`; pkp's `stable-3_4_0` and `stable-3_3_0`
  branches of each app and its lib/pkp. The OJS and OPS 3.4 and 3.3
  settings pages carry the Categories tab and use the same lib/pkp
  `CategoryForm`.
- Introduced: blame on `SeriesForm.php` lines 134–141 and 280–318 stops
  at the PSR-12 reformats a46e881a3a (2022) and 01088072a8 (2021);
  `git log --follow -S` on `getimagesize` and on `imagecreatefrompng`
  gives ce508930ea (2012, Bugzilla 7618, no PR), which added the check,
  the delete-then-decode order and the unchecked decode to both
  `SeriesForm` and `CategoryForm`. The `main` category API carried the
  same check into `Category\Repository` and `generateThumbnail()` in
  [198595800a](https://github.com/pkp/pkp-lib/commit/198595800a0bd40db5db4d41d1a7b34556894719)
  (`pkp/pkp-lib#11243` for `pkp/pkp-lib#10404`, 2025-05-12).
- Upstream search (2026-10-13), pkp/pkp-lib, pkp/omp, pkp/ojs and
  pkp/ui-library, issues and PRs: "series cover image error", "series
  image 500", "series image error", "category cover image error",
  "corrupt image upload", "cover thumbnail broken", "invalid PNG cover",
  and `imagecopyresampled`, `imagecreatefrompng`, `getimagesize`,
  `SeriesForm image`, "GdImage false given". Read and not this fault:
  `pkp/pkp-lib#8730` (a category cover's 500 from a missing `Core`
  import, fixed in 3.4), `pkp/pkp-lib#11494` (warnings on adding a
  category), `pkp/pkp-lib#6002` (deleting a cover).
- Branch tips: `main` OJS 7c6fba2064, OMP eb9381314, OPS 1bc3f78888
  (lib/pkp f4c2578c94 in each); `stable-3_5_0` OJS 5fc74d6213 (lib/pkp
  f4f8fcdbc0), OMP 486cbf9eb and OPS 399c4ebca3 (lib/pkp 8094f06bf5);
  `stable-3_4_0` OJS daf0ca971d, OMP 0aec65441, OPS acd8ae704b (lib/pkp
  55c8e406b3); `stable-3_3_0` OJS d7d9dd14ec, OMP 8e72fc883, OPS
  c5532e2161 (lib/pkp 5e84acd11b).
- Unverified: on 3.3 under PHP 7, `imagecopyresampled()` with `false`
  warns instead of throwing, so the save would finish with the damaged
  file as the cover and a black small copy rather than fail (code). A
  later change of the press's cover thumbnail size, which rebuilds stored
  covers' small copies in `ContextService`, would decode the deleted
  files of a broken series cover and may fail the same way (not driven).
  The monograph's catalog cover was not driven. MySQL not checked;
  nothing here depends on the database.
