# Editing an announcement with a picture the upload check refuses deletes the announcement

- **Severity** high
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code; only with the `announcement_images` config switch on, which is off by default)
  - 3.3: none (code; no announcement picture)
- **Introduced** `pkp/pkp-lib#9260` for `pkp/pkp-lib#9253` · [b0be24e79b](https://github.com/pkp/pkp-lib/commit/b0be24e79bed051ab6584f735753057c6a7db6f0) · 2023-11-08 · Nate Wright (NateWr)
- **Upstream** `pkp/pkp-lib#12744` (open; fix in PR `pkp/pkp-lib#12745`, not yet in main), covering the ".jpeg" refusal only: the deletion, and the refusal of upper-case extensions, stay
- **Tracked in** spec U12 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U12-announcements.md#a2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager edits an announcement and uploads a new picture that the
upload check refuses. The refused names are a JPEG named "photo.jpeg"
and any picture whose name ends in an upper-case extension, such as a
camera's "IMG_0001.JPG". The preview shows. On "Save" the panel shows
"There was an error uploading this image." under "Image", as for any
refused file.

That "Save" also deletes the announcement. Its row stays in the list
until the page is reloaded, then it is gone, with its public page. The
manager loses its title, text, dates and picture, with no undo, and the
message says nothing about it. Uploading the file alone deletes
nothing.

"Add Announcement" with the same picture only refuses the save.

## Impact

- **Lost:** the whole announcement and its public page, published or
  not. Its earlier picture file stays on the server, because nothing
  removes it on this path.
- **Who:** journal, press and server managers, and the site
  administrator for the site's announcements, who change an
  announcement's picture to a file the check refuses. Cameras and
  phones commonly name pictures with upper-case extensions.
- **Way round:** none on screen. A manager who knows the rule renames
  the file to a lower-case ".jpg", ".png" or ".gif" before uploading.
  Once "Save" has been pressed, the announcement has to be written
  again.

High: an announcement is lost for good on a common file name. An
everyday picture change on a secondary screen would make it medium, but
the loss is silent: the message names only the picture, and the list
shows the announcement until a reload. The silence rule lifts it a
level. It would be medium if the panel said the announcement was gone,
or if the refused names were rare.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`. It has no announcements, and
  announcements are off.
- Two pictures on the computer: a PNG named `photo.png`, and a JPEG
  named `photo.jpeg`.

Steps:

1. Sign in as `rvaca`.
2. Go to Settings › Website › Setup › "Announcements", tick "Enable
   announcements" and press "Save".
3. Reload, and open "Announcements" in the side menu.
4. Press "Add Announcement". Enter Title `u12r2 Spring notice`; under
   "Image" press "Upload File" and pick `photo.png`; press "Save". The
   row "u12r2 Spring notice" appears.
5. On that row press "Edit". Under "Image" press "Remove", then "Upload
   File" and pick `photo.jpeg`. The preview shows.
6. Press "Save".
7. Close the panel and reload the page. Then open the announcement's own
   address, `/index.php/publicknowledge/announcement/view/1` (its "View"
   link before step 6).

**Expected:** step 6 is refused under "Image" and changes nothing: after
the reload the list still shows "u12r2 Spring notice", and its page
shows it with `photo.png`.

**Observed:** step 6 shows "There was an error uploading this image."
under "Image" and "Please correct one error." at the panel's foot; the
panel stays open. The save answers:

```
PUT /index.php/publicknowledge/api/v1/announcements/1
400 {"image":["There was an error uploading this image."]}
```

At that moment the announcement is already deleted (no `announcements`
row). After the reload in step 7 the list is empty, and the
announcement's address lands on the public "Announcements" page. The
announcement's `1.png` stays in the public files folder. The server log
has, for the save:

```
PHP Warning:  Attempt to read property "image" on null in …/lib/pkp/classes/announcement/Announcement.php on line 302
```

## Cause

`PKPAnnouncementController::edit()` in pkp-lib
(`api/v1/announcements/PKPAnnouncementController.php`, line 272) answers
a refused picture by deleting the announcement it was editing:

```php
} catch (StoreTemporaryFileException $e) {
    $announcement->delete(); // TODO do we really need to delete an announcement if the image upload fails?
    return response()->json([
        'image' => [__('api.400.errorUploadingImage')]
    ], Response::HTTP_BAD_REQUEST);
}
```

The refusal comes from `Announcement::save()`, which on an edit with a
new picture does three things in this order:

1. `parent::save()` writes the edit, with the new picture data, which
   holds only the upload's temporary file id.
2. `deleteImage()` reads the picture back with `fresh()` to delete the
   old file. It finds the temporary data, which names no file, so it
   removes nothing.
3. `handleImageUpload()` calls `isValidImage()`. That refuses the file
   when `getimagesize()` cannot read it, or when the extension of its
   name differs from the one derived from its content type (`.jpg` for
   every JPEG). The comparison is case-sensitive, so ".jpeg" and ".JPG"
   both fail.

So the check runs after the edit is stored, and the controller's catch
then deletes the stored announcement.

Dropping the delete alone would not be enough. By the time of the
refusal the edit's title and text are saved, and the picture setting
holds the refused upload's temporary data in place of the old picture.
The announcement would keep the changes of a save that answered 400 and
lose its picture.

Reach:

- Every refused picture on an edit: a ".jpeg" name (on screen); an
  upper-case extension, a name that does not match the content, or a
  file `getimagesize()` cannot read (code).
- The site's announcements (Administration › Site Settings ›
  "Announcements"), which use the same controller and model (code).
- A failed copy into the public files folder (an unwritable folder):
  `Announcement::handleImageUpload()` deletes the announcement itself
  before throwing (code; no screen reaches it on a working install).
- Highlights: `HighlightsController::edit()` catches any `Exception` and
  deletes the highlight, so any failure in `Repo::highlight()->edit()`
  (a failed copy, a hook, a database error) deletes it (code). Highlights
  have no name check, so no refused picture reaches it from the screen.

## Proposed fix

Check a new picture before anything is written, and stop deleting the
announcement on a refusal
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-image-deletes-announcement/fix.diff)):

- `Announcement::save()` calls a new `validateNewImage()` before
  `parent::save()`. It loads the temporary file and throws the same
  `StoreTemporaryFileException` when `isValidImage()` refuses it, so a
  refused picture leaves the stored announcement untouched. The check
  moves there from `handleImageUpload()`.
- `PKPAnnouncementController::edit()`'s catch drops
  `$announcement->delete()` and only answers the 400.

```diff
     public function save(array $options = [])
     {
         $newlyCreated = !$this->exists;
+
+        // Refuse an invalid new image before anything is written, so that
+        // the refusal leaves the announcement as it was
+        $this->validateNewImage();
+
         $saved = parent::save($options);
```

```diff
         } catch (StoreTemporaryFileException $e) {
-            $announcement->delete(); // TODO do we really need to delete an announcement if the image upload fails?
             return response()->json([
```

On an add the manager sees no change. The exception now comes before
the insert, so `add()`'s catch finds no id and has nothing to remove,
and the `Announcement::add` hook no longer fires for a refused add. The
intent of the check is kept: a picture in the public files must have a
name that matches its content.

Tried on `main` in all three apps. The walk then showed the Expected:
the refusal message, and after the reload "u12r2 Spring notice" still
listed, its page shown, and its picture setting and `1.png` unchanged.
As a neighbour check, a title-only edit and an edit that replaces the
PNG with a GIF saved the same with the fix in and out. Not tried
together with PR `pkp/pkp-lib#12745`.

**Alternatives:**

- Accept ".jpeg" and upper-case extensions in `isValidImage()`, as PR
  `pkp/pkp-lib#12745` starts to for ".jpeg". This removes the common
  triggers but not the fault: any other refused picture still deletes
  the announcement. It is worth doing beside this fix.
- Check the picture in `Repo::announcement()->validate()`, with the
  other fields. The 400 would then come from the validator like every
  other refusal. But `isValidImage()` would have to move out of the
  model, and the save would still need the guard for other callers.

**What goes with it:**

- An e2e scenario in U12 (a Planned item): an edit with a refused
  picture keeps the announcement, its text and its picture. Or a unit
  test of `Announcement::save()` with a mismatched temporary file.
- The failed-copy delete in `handleImageUpload()` is left as it is. On
  an add it is redundant, because `add()`'s catch removes the new row.
  On an edit, removing it would need the copy to happen before the
  write. Highlights' twin is left as it is too.
- No data repair. 3.5 takes the diff as written. On 3.4 the same two
  changes go into `PKP\announcement\Repository::edit()` and
  `PKPAnnouncementHandler::edit()`, with the check placed before
  `$this->dao->update()`.

Small: one check moved before the write and one line dropped in
pkp-lib, with a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-image-deletes-announcement/walk.js)
  (helpers in `lib.js` beside it; the pictures `photo.png`, `photo.jpeg`
  and `photo.gif` beside it), run on an install freshly loaded with the
  default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/refused-image-deletes-announcement/walk.js`.
  It lists the public files folder after each save and reads the
  announcement's row and `image` setting from the database; a control
  on "Add Announcement" follows the Steps. `MODE=neighbour` runs the neighbour check (a title-only edit,
  then a GIF replacing the PNG).
- Walked on `main` (OJS, OMP, OPS) and `stable-3_5_0` (OJS, OMP, OPS) on
  PostgreSQL, with pkp/datasets 566bb1f (2026-10-03), with `photo.jpeg`
  only. `Announcement.php` and `PKPAnnouncementController.php` are
  identical in the `main` and `stable-3_5_0` lib/pkp commits below.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS c1cee76b95
  (lib/pkp 771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp
  cf3f984335).
- 3.4 and 3.3 (code): lib/pkp `stable-3_4_0` 767353f4fe and
  `stable-3_3_0` ac3fa73402. On 3.4, `PKPAnnouncementHandler::edit()`
  calls `Repo::announcement()->delete()` in its catch. `Repository::edit()`
  runs `$this->dao->update()`, then deletes the old picture's file, then
  calls `handleImageUpload()` and `isValidImage()` (the same comparison).
  `PKPAnnouncementForm` adds the "Image" field only when
  `Config::getVar('features', 'announcement_images')` is on. The shipped
  `config.TEMPLATE.inc.php` has no such key, so the switch is off unless
  an administrator adds it. 3.3's announcement schema has no image.
- Introduced: `git blame` on the catch's delete gives c9cda06979 (PR
  `pkp/pkp-lib#10382`, the 2024 refactor of announcements to a model).
  That commit carried over `Repo::announcement()->delete($announcement)`
  from b0be24e79b. b0be24e79b (PR `pkp/pkp-lib#9260`, "Add site-level
  announcements (main)", for `pkp/pkp-lib#9253`) brought the announcement
  picture, `isValidImage()` and the edit catch that deletes. The 3.4
  branch took the same change in its own #9253 commits (f999bb8db2 and
  before).
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  were searched by symptom words, by `errorUploadingImage`,
  `isValidImage` and the catch's comment. `pkp/pkp-lib#12744` (open,
  3.5.0.4) and its PR `pkp/pkp-lib#12745` (open, against
  `stable-3_5_0`, which turns "jpeg" into "jpg" only) were read.
