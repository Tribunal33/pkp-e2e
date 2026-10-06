# A deleted announcement's picture, and a picture replaced by one of another type, stay on the server and online

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code)
  - 3.3: none (code; no announcement picture)
- **Introduced** `pkp/pkp-lib#10787` for `pkp/pkp-lib#10668` · [0b2ca57ed8](https://github.com/pkp/pkp-lib/commit/0b2ca57ed84822c48eb23c13de3726371623a02e) · 2025-01-09 · Touhidur Rahman (touhidurabir); the replacement since `pkp/pkp-lib#10382` for `pkp/pkp-lib#10328` · [070aa6f77b](https://github.com/pkp/pkp-lib/commit/070aa6f77b2b14e31b9089b5f82a48e8ba11c329) · 2024-09-30 · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U12 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U12-announcements.md#a12)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager who deletes an announcement expects its picture to go with
it. "Delete Announcement" › "Yes" removes the announcement and its
pages, but the picture file stays on the server and is still served at
its old address. That address is named after the announcement's number,
so anyone can guess it.

When a manager replaces a picture with one of another type, for
example a GIF in place of a PNG, the old file stays beside the new one
in the same way. A new picture of the same type overwrites the old file,
as it should.

Nothing on screen shows these files, so the manager is not told. On a
journal, press or server, "Remove" then "Save" on the announcement
before deleting it removes the file. The site's announcements leave
their pictures the same way, and there "Remove" does not help: the
file stays too, and on a press or preprint server the save fails with
an error.

## Impact

- **Lost:** nothing on any page. A picture the journal took down with
  its announcement is still online.
- **Who:** every journal, press and server that deletes an announcement
  with a picture, or changes a picture's type; and the site
  administrator, for the site's announcements.
- **Way round:** on a journal, press or server, "Edit" › "Remove" ›
  "Save" before "Delete". None for the site's announcements. Files
  already left behind can only be removed on the server.

Medium: on its own this is low, since nothing is lost and every page is
right. But the delete looks complete while the deleted announcement's
picture stays public at an address anyone can work out, and the silence
rule lifts it a level. It would be low if the files left behind were
not served.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`. It has no announcements, and
  announcements are off.
- Two pictures on the computer: a PNG named `photo.png` and a GIF named
  `photo.gif`.
- Access to the install's public files folder, where the pictures are
  stored: `public/journals/1/announcements/` (OMP `public/presses/1/…`,
  OPS `public/contexts/1/…`).

Steps:

1. Sign in as `rvaca`.
2. Go to Settings › Website › Setup › "Announcements", tick "Enable
   announcements" and press "Save".
3. Reload, and open "Announcements" in the side menu.
4. Press "Add Announcement". Enter Title `u12r2 Spring notice`; under
   "Image" press "Upload File" and pick `photo.png`; press "Save". The
   folder holds `1.png` (the announcement's number, 1 on the dataset).
5. On that row press "Edit". Under "Image" press "Remove", then "Upload
   File" and pick `photo.gif`; press "Save".
6. Open the announcement's page,
   `/index.php/publicknowledge/announcement/view/1`, and note its
   picture's address.
7. Back on "Announcements", press "Delete" on the row, then "Yes" in
   "Delete Announcement" ("Are you sure you want to permanently delete
   the announcement u12r2 Spring notice?").
8. Open the picture's address from step 6.

**Expected:** after step 5 the folder holds `1.gif` alone. After step 7
it holds no `1.*` file, and step 8 answers "404 Not Found".

**Observed:** after step 5 the folder holds `1.gif` and `1.png`: the
replacement left `1.png`. After step 7 the row is gone and the delete
answers 200, but the folder still holds both files: the delete left
`1.gif`. Step 8 still serves the GIF (`200`, `image/gif`). The server
log has, for the delete:

```
PHP Warning:  Attempt to read property "image" on null in …/lib/pkp/classes/announcement/Announcement.php on line 302
```

Control: on a second announcement with `photo.png`, "Edit" › "Remove" ›
"Save" deletes its file.

The site's announcements (Administration › Site Settings ›
"Announcements", shown once the site has a second journal) store their
pictures in `public/site/announcements/` and leave them the same way.

## Cause

`Announcement::deleteImage()` in pkp-lib
(`classes/announcement/Announcement.php`, line 302) finds the file to
delete by reading the announcement back from the database:

```php
protected function deleteImage(): void
{
    $image = $this->fresh()->image;
```

It has three call sites. Two of them run it after the database has
already changed, so it reads the wrong picture or none:

- `delete()` calls it after `parent::delete()`. `fresh()` on a deleted
  model returns `null`, so `$image` is `null` (the warning above) and no
  file is removed.
- `save()` calls it, for a new picture, after `parent::save()` has
  written the new picture data. That data holds only the upload's
  temporary file id and its alternate text, with no `uploadName`, so
  the old file is not removed. `handleImageUpload()` then writes
  `{id}.{extension}`: over the old file when the type is the same,
  beside it when not.

The third, "Remove" then "Save", works. `parent::save()` leaves the
removed picture's setting row in the database, so `fresh()` still reads
the old picture, and `save()` deletes that row afterwards.

History. Until 3.4, `PKP\announcement\Repository` deleted the file from
the announcement as loaded, before the edit or the delete. PR
`pkp/pkp-lib#10382` (2024) moved the image handling into the model,
where `deleteImage()` read the current attribute after the write. Within
that PR, 070aa6f77b made a new picture on an edit reach that code, and
replacements stopped removing the old file. 0b2ca57ed8
(`pkp/pkp-lib#10787`) added the "Remove" branch and switched
`deleteImage()` to `fresh()`, which stopped the delete from removing the
file.

Reach:

- "Delete Announcement" on a journal's, press's or server's
  announcement, and on the site's (on screen, all three apps).
- A replacement by a picture of another type, on both (on screen).
- An announcement deleted because an edit's picture was refused
  ([pkp-e2e#770](https://github.com/jardakotesovec/pkp-e2e/issues/770)):
  its file stays (on screen).
- Removing an announcement type, and deleting a journal, delete the
  announcements with a query (`Announcement::withTypeIds()->delete()` in
  `AnnouncementTypeDAO::deleteById()`, `Announcement::withContextIds()->delete()`
  in `PKPContextService::delete()`), which never calls the model's
  `delete()`, so their files stay too (code). In 3.4 both went through
  `Repo::announcement()->deleteMany()`, which removes each file, so this
  is the same regression from `pkp/pkp-lib#10382`. Both are left out of
  the fix (below).
- Highlights keep the 3.4 pattern (`PKP\highlight\Repository::edit()`
  and `delete()` take the file name from the highlight as loaded), and
  are not affected (code).

## Proposed fix

Take the picture to delete from the announcement as it was loaded,
before the write, and pass it to `deleteImage()`; and pick the folder
the way `storeTemporaryFile()` does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/announcement-image-files-left-behind/fix.diff)):

```diff
     public function delete()
     {
+        // The image as loaded (or as last saved); the row is gone once parent::delete() returns
+        $image = $this->getOriginal('image');
         $deleted = parent::delete();
         if ($deleted) {
-            $this->deleteImage();
+            $this->deleteImage($image);
         }
```

- `save()` reads `$storedImage = $this->getOriginal('image')` before
  `parent::save()` (null for a new announcement). It passes it to
  `deleteImage()` for a new picture, and uses it in place of
  `$this->fresh()->image` in the "Remove" condition.
- `deleteImage(?object $image)` takes that picture and no longer calls
  `fresh()`.
- `deleteImage()` picks the folder with `$this->assocId ?
  getContextFilesPath($this->assocId) : getSiteFilesPath()`, as
  `storeTemporaryFile()` does. Today it tests
  `$this->hasAttribute('assocId')`, which is always true because the
  schema casts declare `assocId`. A site announcement, whose `assocId`
  is null, would get `public/journals/0` on OJS, and a `TypeError` from
  `getContextFilesPath(null)` on OMP and OPS. Today a site
  announcement's delete and replacement never reach that line: on a
  delete `$image` is null, and on a replacement it is the temporary
  data, which names no file. With the first two changes both reach it.
  The site's "Remove" then "Save" already reaches it today, because
  `fresh()` still reads the old picture: OJS looks in
  `public/journals/0` and leaves the file, and OMP and OPS answer 500
  with the `TypeError` and keep it (code). The folder change mends that
  path too.

`getOriginal()` returns the picture as the announcement was loaded with
`find()`, which is how the edit and delete endpoints load it. After a
save, Eloquent re-syncs the originals, so on an instance that was just
saved it returns the new data. That happens on three paths: the nested
`save()` in `handleImageUpload()` after a good copy, a failed copy in
`handleImageUpload()`, and the refused-picture catch in the controller
([pkp-e2e#770](https://github.com/jardakotesovec/pkp-e2e/issues/770)).
It is harmless on all three. The nested save has no new picture and
removes nothing, and on the other two `save()` has already removed the
old file before `handleImageUpload()` runs. On its own, this fix therefore removes the old file on the
refused-picture path, where the announcement is deleted too. Deleting
the old file before `handleImageUpload()` writes the new one, as today,
keeps a same-type replacement working.

Tried on `main` in all three apps. The walk then showed the Expected:
`1.gif` alone after the replacement, no file after the delete, and the
picture's address answering 404. The site's announcements did the same
(`public/site/announcements/` empty after the delete, every save and
delete answering 200). As a neighbour check, a same-type replacement
kept the new file, a title-only edit kept the file, and "Remove" then
"Save" still deleted it, with the fix in and out.

**Alternatives:**

- Keep `fresh()`, and call `deleteImage()` before `parent::delete()` and
  `parent::save()`. This fixes the two call sites, but deletes the old
  file even when the write then fails, and keeps a database read per
  call.
- Delete every `{id}.*` file in the folder. This would also clean up
  after past replacements, but it guesses at file names instead of
  reading the stored one.

**What goes with it:**

- An e2e scenario in U12 (a Planned item): the folder after a delete and
  after a replacement of another type, on a journal and on the site. Or
  a unit test of `Announcement::delete()` and `save()` with a stored
  picture.
- The type removal and the journal delete are left out. The type
  removal belongs to the report on removing an announcement type, which
  asks whether it should delete announcements at all. Both would load
  the announcements and call `delete()` on each
  (`->get()->each->delete()`) to remove the files.
- `imageUrl()` builds the picture's address with the same
  `hasAttribute('assocId')` test, so on OMP and OPS a page that prints a
  site announcement's picture calls `getContextFilesPath(null)` and
  throws the same `TypeError` (code; not walked). It is left out; the
  same one-line change applies.
- Files left by earlier deletes and replacements stay. A cleanup would
  compare each `announcements/` folder with the stored `uploadName`s.
  It is not needed for the fix.
- 3.5 takes the diff as written.
- This diff and the one for refused pictures
  ([pkp-e2e#770](https://github.com/jardakotesovec/pkp-e2e/issues/770))
  change the same lines at the top of `save()`, so whichever lands
  second needs a trivial rebase.

Small: three call sites, one signature and the folder test in one
class, with a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/announcement-image-files-left-behind/walk.js)
  (helpers and pictures in
  `shared/playwright/checks/issues/refused-image-deletes-announcement/`),
  run on an install freshly loaded with the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/announcement-image-files-left-behind/walk.js`.
  It lists the public files folder after each step and reads the
  announcement's `image` setting from the database; the Control follows
  the Steps. `MODE=neighbour` runs the neighbour check (a PNG replacing
  the PNG, a title-only edit, then "Remove" and "Save"). `MODE=site`
  walks the site's announcements: as `admin`, Administration › Hosted
  Journals › "Create Journal" for a second journal (`u12r2second`), Site
  Settings › "Announcements" › "Settings" › "Enable announcements", then
  the same add, GIF replacement and delete, listing
  `public/site/announcements/`.
- Walked on `main` (OJS, OMP, OPS) and `stable-3_5_0` (OJS, OMP, OPS) on
  PostgreSQL, with pkp/datasets 566bb1f (2026-10-03). Steps 6 and 8 (the
  picture's address) were walked on `main` only; the 3.5 walk read the
  folder. The site case (add, GIF replacement, delete) was walked on
  `stable-3_5_0` and on `main` (with the fix in and out). The site's
  "Remove" then "Save", today and with the fix, was read in the code,
  not walked. `Announcement.php` is identical in the `main` and
  `stable-3_5_0` lib/pkp commits below.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS c1cee76b95
  (lib/pkp 771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp
  cf3f984335).
- 3.4 and 3.3 (code): lib/pkp `stable-3_4_0` 767353f4fe and
  `stable-3_3_0` ac3fa73402. 3.3's announcement schema has no image.
- Introduced: `git blame` on `deleteImage()`'s `fresh()` line gives
  0b2ca57ed8 (PR `pkp/pkp-lib#10787`, merged 2025-01-23). At its parent,
  `deleteImage()` read `$this->getAttribute('image')`. That held the
  stored picture on a delete, and the new one on a replacement. The edit
  branch was gated on a top-level `temporaryFileId` in c9cda06979, which
  the panel never sends. 070aa6f77b (2024-09-30) read it from the
  picture, so replacements reached `deleteImage()`. Both commits are in
  PR `pkp/pkp-lib#10382` (merged 2024-10-01).
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  were searched by symptom words and by `deleteImage`.
