# A .gif too large for the profile image is refused, yet the user's current picture is removed

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/ojs` [08c9c8a222](https://github.com/pkp/ojs/commit/08c9c8a222ecc3d6523dce923300ab5463f1cf85) (no PR; #3537 in the old tracker) · 2008-06-09 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U03 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A user who chooses a .gif larger than 150 × 150 pixels as their
profile image, on the profile's "Public" tab, is refused with "The file
could not be uploaded or revised.", which is right. But the picture
they already had goes too: on the next reload "Profile Image" is empty
and its "Delete" button is gone, and nothing said so.

Both files stay on the server and are still served: the refused .gif,
and the earlier picture, which the user now believes is gone.

A .jpg or .png never meets this, because the browser shrinks it to
150 × 150 before it is sent. The fix is a few lines in one method.

## Impact

- **Lost**: the account's profile image. Its file, and the refused
  .gif, stay public at `/public/site/profileImage-<user ID>.<ext>`, an
  address anyone can guess from the user's numeric ID. Nothing removes
  them: "Delete" on the Public tab removes only the file the account
  currently uses, and removing or merging the account removes no
  profile image file.
- **Who**: any signed-in user who picks a .gif over 150 × 150 for
  their own profile, in any journal, press or server; rare in ordinary
  use. The picture is shown only on that tab: no reader page,
  masthead or list shows a profile image, and no bundled theme or
  plugin in the three apps does either.
- **Way round**: upload the earlier picture again, from the user's own
  copy; its old file is still at its address, but nothing on screen
  leads to it.

Low: the lost picture is one the application shows to nobody but its
owner. A third-party theme or plugin that shows profile images to
readers would raise it to medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS).
- Two pictures on your computer: `u03rh-photo.jpg`, a 100 × 100 JPEG,
  and `u03rh-banner.gif`, a 300 × 300 GIF.

Steps:

1. Sign in as `dbarnes`.
2. Open the user menu › "Edit Profile", then the "Public" tab
   (`/index.php/publicknowledge/en/user/profile/publicProfile`).
3. Under "Profile Image" press "Upload File" and choose
   `u03rh-photo.jpg`. The page reloads on the "Public" tab, showing the
   picture and "Delete". Note the picture's address: it ends
   `/public/site/profileImage-3.jpg` (3 is `dbarnes`'s user ID).
4. Press "Upload File" again and choose `u03rh-banner.gif`. An alert
   says "The file could not be uploaded or revised.", and the same
   sentence shows in the upload area. Press OK.
5. Reload the page.
6. Open the picture's address with `.gif` in place of `.jpg`
   (`…/public/site/profileImage-3.gif`).
7. Open the picture's address from step 3 (`…/profileImage-3.jpg`).

**Expected**: the refusal changes nothing. After the reload "Profile
Image" still shows the picture and "Delete". The refused .gif is not
kept, so its address is not found (404).

**Observed**: after the reload "Profile Image" is empty and there is no
"Delete". Step 6 shows the refused 300 × 300 .gif (200, `image/gif`).
Step 7 still shows the 100 × 100 .jpg (200, `image/jpeg`), though the
account no longer points to it. No request failed and the server
logged no error.

A text file named `u03rh-notes.png`, chosen between steps 3 and 4, is
refused with the same alert and sentence, and after a reload the
picture and "Delete" are still there: a file that is not an image is
refused at `getImageExtension()`, before anything is written.

## Cause

`PublicProfileForm::uploadProfileImage()`
(`lib/pkp/classes/user/form/PublicProfileForm.php`, lines 89–102 on
`main`) moves the upload into the site's public files first, as
`profileImage-<userId>.<ext>`, and checks its size afterwards. When the
image is larger than `PROFILE_IMAGE_MAX_WIDTH` × `PROFILE_IMAGE_MAX_HEIGHT`
(150 × 150), the refusal branch tries to undo the move:

```php
$userSetting = null;
$user->setData('profileImage', $userSetting);
Repo::user()->edit($user, ['profileImage']);
$publicFileManager->removeSiteFile($filePath);
return false;
```

- It sets the user's `profileImage` setting to null and saves it, so
  the account loses its current picture, whatever that was, while the
  picture's file stays on disk.
- It passes `$filePath`, which is `getSiteFilesPath()` (the
  directory), to `removeSiteFile()` instead of `$uploadName`.
  `removeSiteFile()` prefixes the site files path again, so it asks to
  delete `<public>/site/<public>/site`, which does not exist, and the
  refused file stays.

The rule it breaks: a refused upload must leave the account and its
files as they were. The root is the order. The file is written over
`profileImage-<userId>.<ext>` before it is checked, so when the current
picture is itself a .gif, the refused .gif has already replaced its
file. Clearing the setting is meant for that case: it stops the
account pointing at the oversize file. But it runs on every refusal,
so it also drops a .jpg or .png picture that nothing had touched.
Checking the temporary file first makes both the null and the delete
unnecessary.

Reach:

- Only an oversize .gif reaches the check from the screen: the tab's
  uploader shrinks a .jpg or .png to 150 × 150 in the browser
  (`resize` in `templates/user/publicProfileForm.tpl`); on the running
  app a 400 × 400 .png was stored at 150 × 150.
- The other `removeSiteFile()` caller is `PKPSiteService::_saveFileParam()`.
  For the site logo it passes the stored `uploadName` and the file is
  deleted. For the site's style sheet it passes the whole stored value
  (an array) instead of a file name, so nothing is deleted; the same
  happens for a journal's style sheet in
  `PKPContextService::_saveFileParam()`, through `removeContextFile()`.
  That is a separate cause, reported in
  [U10-A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U10-A5-removed-style-sheet-stays-public.md).
- A successful upload in another format (a .png after a .jpg) leaves
  the earlier file behind too, because only the setting is replaced
  (read in the code). That is a separate leftover, not this cause.
- No app overrides the form, and no plugin hook takes part. The REST
  API's user record carries `profileImage`, so it reads null after a
  refusal too (read in the code).

## Proposed fix

Check the uploaded image's size on the temporary file, before it is
moved into the public files, and return `false` without touching the
setting or any file. The diff
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-gif-wipes-profile-image/fix.diff)):

```diff
-        $uploadName = 'profileImage-' . (int) $user->getId() . $extension;
-        if (!$publicFileManager->uploadSiteFile('uploadedFile', $uploadName)) {
+        // Check the image before it is moved into the public files, so that a
+        // refused upload leaves the user's current image and its file alone
+        $temporaryFilePath = $publicFileManager->getUploadedFilePath('uploadedFile');
+        [$width, $height] = ($temporaryFilePath ? getimagesize($temporaryFilePath) : false) ?: [0, 0];
+        if ($width > self::PROFILE_IMAGE_MAX_WIDTH || $height > self::PROFILE_IMAGE_MAX_HEIGHT || $width <= 0 || $height <= 0) {
             return false;
         }
-        $filePath = $publicFileManager->getSiteFilesPath();
-        [$width, $height] = getimagesize($filePath . '/' . $uploadName);
 
-        if ($width > self::PROFILE_IMAGE_MAX_WIDTH || $height > self::PROFILE_IMAGE_MAX_HEIGHT || $width <= 0 || $height <= 0) {
-            $userSetting = null;
-            $user->setData('profileImage', $userSetting);
-            Repo::user()->edit($user, ['profileImage']);
-            $publicFileManager->removeSiteFile($filePath);
+        $uploadName = 'profileImage-' . (int) $user->getId() . $extension;
+        if (!$publicFileManager->uploadSiteFile('uploadedFile', $uploadName)) {
             return false;
         }
```

Other uploads already inspect the temporary file before saving it:
`PKPUploadPublicFileController` and the announcement image call
`getimagesize()` on it to check that it is an image, and the category
image's validation also reads its width and height there. The fix
keeps what the refusal branch was for, that the account never points
at an oversize file, because no oversize file is ever written.

Tried on `main` in the three apps: the Steps then show the picture and
"Delete" after the reload, and the `.gif` address answers 404. An
accepted .gif and a shrunk .png still replace the picture, and "Delete"
still removes it, with the fix in and out.

**Alternatives**

- Pass `$uploadName` to `removeSiteFile()` and drop the null: when the
  current picture is a .gif, its file has already been overwritten, so
  the delete would leave the account pointing at a missing file.
- Shrink .gif files in the browser too: the uploader's resize handles
  JPEG and PNG only, and the server must refuse a request that skips
  the browser anyway.
- Shrink oversize images on the server instead of refusing them: a
  product change, not a fix.

**What goes with it**

- No data repair: a leftover `profileImage-<id>.*` file does not show
  whether it was a picture the account lost or a refused upload, so no
  script can restore the setting safely.
- The same lines are in 3.5 and 3.4 and apply as written; 3.3 has them
  in `PublicProfileForm.inc.php` with `list()` and the global
  constants, and needs the same change in that form.
- Optionally, in the same method, remove the previous file when a
  successful upload has another name (the separate leftover in the
  reach).
- The guard: an end-to-end check that an oversize .gif is refused, the
  picture and "Delete" remain after a reload, and no `.gif` is stored.
  The method reads `$_FILES` and `is_uploaded_file()`, which a unit
  test cannot easily stand in for.

Small: about ten lines changed in one method, no data
repair, tried.

## Evidence

- A Playwright script that runs the Steps, with the text-file check, on
  installs loaded from PKP's default test dataset, all three apps in
  one run, making its own picture files:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-gif-wipes-profile-image/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-gif-wipes-profile-image/lib.js)):
  `node bin/probe.js all shared/playwright/checks/issues/refused-gif-wipes-profile-image/walk.js [walk|neighbour]`,
  where `neighbour` uploads a 100 × 100 .gif, then a 400 × 400 .png,
  then presses "Delete" (run with the fix in and out).
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [566bb1f](https://github.com/pkp/datasets/commit/566bb1fb7af773fe500f7630170f7cd872fba88d) (2026-10-03);
  MySQL not checked, and nothing here depends on the database:
  - main: OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6); `PublicProfileForm.php` is the
    same file in the three.
  - stable-3_5_0: OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246
    and OPS 38b61882d3 (lib/pkp cf3f984335); `PublicProfileForm.php`
    is `main`'s with a class alias added.
- 3.4 and 3.3 were read in the code, not run ("(code)" in the header):
  - 3.4: OJS `stable-3_4_0` at d68934d0d1, OMP at 0aec65441, OPS at
    acd8ae704b, pkp-lib `stable-3_4_0` at 767353f4fe:
    `classes/user/form/PublicProfileForm.php` (the same
    `uploadProfileImage()`) and `templates/user/publicProfileForm.tpl`
    (the same resize, JPEG and PNG only).
  - 3.3: OJS `stable-3_3_0` at ac77c9fb35, OMP at 8e72fc883, OPS at
    c5532e2161, pkp-lib `stable-3_3_0` at ac3fa73402:
    `classes/user/form/PublicProfileForm.inc.php` (the same branch,
    with `updateSetting()` in place of `Repo::user()->edit()`) and the
    same template.
- Impact, read in the code on `main`: `deleteProfileImage()` removes
  only the setting's `uploadName`; `Repo::user()->delete()` and
  `mergeUsers()` remove no profile image file; `profileImage` is read
  only by `PublicProfileForm` and `publicProfileForm.tpl` in the three
  apps, their bundled plugins and themes included.
- Introduced: `git blame` on the refusal branch gives e3f570bc37
  (PSR-12 formatting) and 0c03f30381 (2021, `updateSetting()` to
  `Repo::user()->edit()`); before them the lines come from 90a749ab58
  (`pkp/pkp-lib#478`, 2015, the tabbed profile), which moved them from
  `PKPProfileForm`, where db8de7626d (2012, "Reconcile User code")
  brought them from the apps. In OJS they were written in 08c9c8a222
  ("#3537# Added user image", 2008), the same branch with the same
  `removeSiteFile($filePath)`, and unchanged in what they do since.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched
  2026-10-03 for the profile image or picture with gif, too large,
  deleted, removed, lost and upload failed, and for
  `uploadProfileImage`, `PublicProfileForm` and `removeSiteFile`. The
  nearest hits are other faults: `pkp/pkp-lib#10249` (profile image
  settings lost in an upgrade from before 3.3) and `pkp/pkp-lib#8899`
  (avatars from profile images, open).
- Read in the code, not run: a current picture that is itself a .gif,
  and a successful upload in another format leaving the earlier file.
