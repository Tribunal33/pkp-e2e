# Uploading a file that is not a plugin package shows PHP's archive error with a server path

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the refusal reads "Files of this type can not be uploaded.")
- **Introduced** `pkp/pkp-lib#7075` for `pkp/pkp-lib#6092` and `pkp/pkp-lib#6077` · [b0bf4d766f](https://github.com/pkp/pkp-lib/commit/b0bf4d766f66cf24516d4bdd635d2b7a52872dfa) · 2021-05-21 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#4243` (closed), the same request for the code before `pkp/pkp-lib#7075` replaced it
- **Tracked in** spec U62 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U62-plugins-management.md#a10)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When the Site Administrator uploads a file that is not a plugin package
through "Upload A New Plugin", the upload should be refused with a
sentence saying the file is not a plugin package. Instead the notice is
a message from the server's archive handling that names the full path
of the uploaded file on the server, such as "Cannot create phar
'/home/e2e/pkp-e2e/checkouts/files/ojs-test-ds4/temp/txtCwku8e', file
extension (or combination) not recognised or the directory does not
exist".

Nothing is installed, but the message does not tell the administrator
what was wrong with the file or what to upload instead.

## Impact

- **Lost**: nothing; the file is refused, but in PHP's words, naming a
  temporary file the administrator never chose.
- **Who**: the Site Administrator, when the file chosen is not a
  ".tar.gz" archive (a text file, a document, a download
  that failed).
- **Way round**: none on screen: the administrator must already know
  that the plugin must be a ".tar.gz" archive.

Low: the upload is refused as it should be; only the message is wrong.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main` (OJS, OMP or OPS),
with `allow_plugin_install = on` in config.inc.php, the default; on the
computer, a plain text file `u62g4-notes.txt` (any text) and a
copy of it renamed `u62g4-notes.tar.gz`.

A text file:

1. Sign in as `admin`.
2. Open Settings › Website (`/index.php/publicknowledge/management/settings/website`) and its "Plugins" tab.
3. Press "Upload A New Plugin".
4. Press "Upload File" and choose `u62g4-notes.txt`. The button now reads "Change File".
5. Press "Save".

A text file named ".tar.gz":

6. Press "Upload A New Plugin" again, press "Upload File", choose `u62g4-notes.tar.gz` and press "Save".

**Expected:** each upload is refused with a sentence saying the file is
not a plugin package and that the plugin must be a ".tar.gz" archive.

**Observed:** the window closes and a notice at the top right reads, in
OJS (OMP and OPS name their own files folder):

```
Cannot create phar '/home/e2e/pkp-e2e/checkouts/files/ojs-test-ds4/temp/txtCwku8e', file extension (or combination) not recognised or the directory does not exist
```

and for the renamed file:

```
internal corruption of phar "/tmp/u62g4-notes2d78a19b76.tar.gz" (__HALT_COMPILER(); not found)
```

Nothing is installed. The server logs no error; the save answers 200.

Control: a ".tar.gz" archive holding a folder with no "version.xml" is refused
with the application's own sentence, "The uploaded plugin archive does
not contain a folder that corresponds to the plugin name."

## Cause

`PluginHelper::extractPlugin()` (`lib/pkp/classes/plugins/PluginHelper.php`)
opens the upload with PHP's archive class:

```php
(new PharData($filePathWithExtension ?? $filePath))->extractTo($extractPath, null, true);
```

`PharData` throws an `UnexpectedValueException` when the file is not an
archive it can read, and its message names the file it was given, a
temporary copy on the server. Nothing catches it on the way:
`UploadPluginForm::execute()` catches every `Exception` and shows
`$e->getMessage()` as the error notice. Unlike this failure, every
refusal the code means to give (no "version.xml", a wrong category, an
older version) is thrown with a translated sentence.

This handling was there before. On 3.3 the archive was unpacked with the
`tar` command, and a failed `tar` was refused with
`form.dropzone.dictInvalidFileType`, "Files of this type can not be
uploaded." (the request of `pkp/pkp-lib#4243`). Commit b0bf4d766f
replaced the `tar` call with `PharData` to stop depending on `exec`
(`pkp/pkp-lib#6077`), and the refusal went with the old code.

Reach:

- "Upload A New Plugin" and a plugin row's "Upgrade" both go through
  `extractPlugin()` (`installPlugin()`, `upgradePlugin()`): "Upload A
  New Plugin" was checked on screen, "Upgrade" in the code.
- The Plugin Gallery's "Install" and "Upgrade" go through it too, but
  only after the downloaded package's checksum matched the gallery's, so
  a package `PharData` cannot read does not reach it there (code).
- `extractPlugin()` and `installPlugin()` also throw a few untranslated
  messages for a server fault ("Could not create directory …", "Failed
  to copy plugin file", "Missing installation file"). These need a
  misconfigured server rather than a wrong file, and their detail helps
  the administrator who runs it; they are left as they are.
- `PharData` is used nowhere else in lib/pkp or the apps.

## Proposed fix

Catch `PharData`'s failure where the archive is opened and throw the
refusal in the application's words, keeping PHP's exception as the
previous one
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-plugin-not-archive-server-message/fix.diff)):

```php
use PharException;
use UnexpectedValueException;
// …
try {
    (new PharData($filePathWithExtension ?? $filePath))->extractTo($extractPath, null, true);
} catch (UnexpectedValueException|PharException $e) {
    throw new Exception(__('manager.plugins.invalidPluginPackage'), 0, $e);
}
```

with a new key in `locale/en/manager.po`:

```
msgid "manager.plugins.invalidPluginPackage"
msgstr ""
"The uploaded file is not a plugin package. Please ensure the plugin is "
"compressed as a .tar.gz file."
```

This follows the function's other refusals, each an `Exception` with a
translated sentence, and covers every caller of `extractPlugin()`.
`PharException` is caught too because `extractTo()` throws it for an
archive that opens but cannot be unpacked. Tried on `main` in all three
apps: both uploads of the Steps were refused with the new sentence, and
a ".tar.gz" archive with no "version.xml" kept its own refusal.

**Alternatives:**

- Reusing `form.dropzone.dictInvalidFileType`, as 3.3 did: no new key
  to translate, but "Files of this type can not be uploaded." is wrong
  for a file named ".tar.gz" and does not say what to upload.
- `manager.plugins.invalidPluginArchive`: it speaks of a missing plugin
  folder, which is not this fault.
- Checking the file name's extension before unpacking: a file named
  ".tar.gz" that is not one would still reach `PharData`.

**What goes with it:**

- No stored data and no API change; translators get one new key, and
  until it is translated the other languages show the English sentence.
- It applies as written to 3.5 and 3.4, where `extractPlugin()` is the
  same.
- A regression test: a unit test of `PluginHelper::installPlugin()` with
  a text file, expecting the new sentence. It needs `allow_plugin_install`
  on (or `$gallerySource = true`), or `installPlugin()` refuses first.

Small: a `try` around one call, one locale key and a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-plugin-not-archive-server-message/walk.js),
  takes the Steps on an install reset to the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/upload-plugin-not-archive-server-message/walk.js`.
  Nothing it uploads is installed.
- Walked on `main` (OJS, OMP, OPS) and `stable-3_5_0` (OJS, OMP, OPS),
  each on PostgreSQL, loaded from pkp/datasets c657990 (2026-10-01). The
  paths in Observed are the test install's own. The one-context dataset
  leaves "Plugins" out of Administration › Site Settings, so the Steps
  use the context's Settings › Website.
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP `main` 3b0ecf794, OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6 for both); OJS `stable-3_5_0` 091fb65453, OMP 9c5e24246,
  OPS 38b61882d3 (lib/pkp cf3f984335); `stable-3_4_0` lib/pkp
  32b0f4b4af (OJS 75cc2d488b, OMP 0aec65441, OPS acd8ae704b);
  `stable-3_3_0` lib/pkp f6ab331645 (OJS ac77c9fb35, OMP 8e72fc883, OPS
  c5532e2161).
- 3.4 (code): `classes/plugins/PluginHelper.php` `extractPlugin()` on
  `stable-3_4_0`'s lib/pkp, which holds b0bf4d766f.
- 3.3 (code): `classes/plugins/PluginHelper.inc.php` unpacks with
  `tar -xzf` and throws `form.dropzone.dictInvalidFileType` when it fails
  (the refusal added by 69c106f370 for `pkp/pkp-lib#4243`, its key
  changed by 98d580490a); b0bf4d766f is not on `stable-3_3_0`.
- Introduced: `git blame` and `git log -L` on the `PharData` line lead
  through cc90cbbd87 and 94f959f922 (2023, `pkp/pkp-lib#8723`, which
  added the copy with the original extension and kept the call
  unguarded) to b0bf4d766f, which put `PharData` in place of the `tar`
  call and its refusal.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library for the symptom ("Cannot create phar", "internal
  corruption of phar", "file extension (or combination) not recognised",
  "plugin upload invalid file type") and the code (`PharData`,
  `extractPlugin`). `pkp/pkp-lib#4243` (closed 2018) asked for this
  refusal on the `tar` code. `pkp/pkp-lib#8772` and `pkp/pkp-lib#8822`
  (closed) show the same PHP message for valid gallery packages, saved
  without their extension; the `pkp/pkp-lib#8723` changes fixed that,
  not this.
